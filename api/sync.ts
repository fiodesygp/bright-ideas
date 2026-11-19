// Vercel Function (Node runtime): receives uploads from the app and writes
// them to Supabase with the secret key, which never reaches the browser.
//
//   POST application/json  { deviceId, appVersion, learners?, entries?, deletes? }
//   POST image/jpeg        ?device=<uuid>&entry=<local id>   (one photo per request)
//   OPTIONS                CORS preflight
//
// Env (Vercel → Settings → Environment Variables):
//   SUPABASE_URL               https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  the secret key (sb_secret_…)
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'log-photos'
const MAX_JSON_BYTES = 1_000_000
const MAX_PHOTO_BYTES = 2 * 1024 * 1024
const MAX_RECORDS = 100
const MAX_DELETES = 500

/** Sites that may call this endpoint from another origin. */
const ALLOWED_ORIGINS = new Set([
  'https://brightideas-agripv.vercel.app',
  'https://fiodesygp.github.io',
  'http://localhost:5173',
])

/* ---------- Validation ---------- */

class BadRequest extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

type Rec = Record<string, unknown>

function obj(v: unknown, what: string, keys: string[], required = keys): Rec {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new BadRequest(`${what} must be an object`)
  const unknown = Object.keys(v).filter((k) => !keys.includes(k))
  if (unknown.length) throw new BadRequest(`${what} has unknown fields: ${unknown.join(', ')}`)
  const missing = required.filter((k) => !(k in v))
  if (missing.length) throw new BadRequest(`${what} is missing: ${missing.join(', ')}`)
  return v as Rec
}
function str(v: unknown, what: string, max: number, min = 0) {
  if (typeof v !== 'string' || v.length < min || v.length > max) throw new BadRequest(`${what} must be text of ${min}–${max} characters`)
  return v
}
function int(v: unknown, what: string) {
  if (!Number.isSafeInteger(v) || (v as number) < 0) throw new BadRequest(`${what} must be a whole number`)
  return v as number
}
function num(v: unknown, what: string, max: number) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max) throw new BadRequest(`${what} must be a number from 0 to ${max}`)
  return v
}
function date(v: unknown, what: string, optional = false) {
  if (optional && v === '') return null
  if (typeof v !== 'string' || !ISO_DATE.test(v) || Number.isNaN(Date.parse(v))) throw new BadRequest(`${what} must be a YYYY-MM-DD date`)
  return v
}
function time(v: unknown, what: string) {
  // Milliseconds since 1970, between 2020 and a day from now.
  if (!Number.isSafeInteger(v) || (v as number) < 1_577_836_800_000 || (v as number) > Date.now() + 86_400_000) throw new BadRequest(`${what} must be a time`)
  return new Date(v as number).toISOString()
}
function boolOrNull(v: unknown, what: string) {
  if (v !== null && typeof v !== 'boolean') throw new BadRequest(`${what} must be true, false or null`)
  return v
}
function list(v: unknown, what: string, max: number) {
  if (v === undefined) return []
  if (!Array.isArray(v) || v.length > max) throw new BadRequest(`${what} must be a list of at most ${max}`)
  return v
}

const photoPath = (deviceId: string, entryId: number) => `${deviceId}/${entryId}.jpg`

function parseBatch(body: unknown) {
  const b = obj(body, 'body', ['deviceId', 'appVersion', 'learners', 'entries', 'deletes'], ['deviceId', 'appVersion'])
  const deviceId = str(b.deviceId, 'deviceId', 36)
  if (!UUID.test(deviceId)) throw new BadRequest('deviceId must be a UUID')
  const appVersion = str(b.appVersion, 'appVersion', 40)

  const learners = list(b.learners, 'learners', MAX_RECORDS).map((v, i) => {
    const l = obj(v, `learners[${i}]`, ['localId', 'name', 'plant', 'startDate'])
    return {
      device_id: deviceId,
      local_id: int(l.localId, 'localId'),
      name: str(l.name, 'name', 30, 1),
      plant: str(l.plant, 'plant', 40),
      start_date: date(l.startDate, 'startDate', true),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }
  })

  const entries = list(b.entries, 'entries', MAX_RECORDS).map((v, i) => {
    const e = obj(v, `entries[${i}]`, [
      'localId', 'learnerId', 'plantId', 'date', 'height', 'heightUnit', 'heightCm',
      'note', 'soilChecked', 'watered', 'hasPhoto', 'createdAt', 'updatedAt',
    ])
    const localId = int(e.localId, 'localId')
    if (e.heightUnit !== 'cm' && e.heightUnit !== 'in') throw new BadRequest('heightUnit must be cm or in')
    if (typeof e.hasPhoto !== 'boolean') throw new BadRequest('hasPhoto must be true or false')
    const createdAt = time(e.createdAt, 'createdAt')
    return {
      device_id: deviceId,
      local_id: localId,
      learner_local_id: e.learnerId === null ? null : int(e.learnerId, 'learnerId'),
      plant_id: int(e.plantId, 'plantId'),
      date: date(e.date, 'date'),
      height: num(e.height, 'height', 1000),
      height_unit: e.heightUnit,
      height_cm: num(e.heightCm, 'heightCm', 3000),
      note: str(e.note, 'note', 1000),
      soil_checked: boolOrNull(e.soilChecked, 'soilChecked'),
      watered: boolOrNull(e.watered, 'watered'),
      photo_path: e.hasPhoto ? photoPath(deviceId, localId) : null,
      created_at: createdAt,
      updated_at: e.updatedAt === null ? createdAt : time(e.updatedAt, 'updatedAt'),
      deleted_at: null,
    }
  })

  const deletes = list(b.deletes, 'deletes', MAX_DELETES).map((v, i) => {
    const d = obj(v, `deletes[${i}]`, ['table', 'localId'])
    if (d.table !== 'learners' && d.table !== 'entries') throw new BadRequest('table must be learners or entries')
    return { table: d.table as 'learners' | 'entries', localId: int(d.localId, 'localId') }
  })

  return { deviceId, appVersion, learners, entries, deletes }
}

/* ---------- Writing to Supabase ---------- */

let client: SupabaseClient | undefined
function supabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return client
}

function check<T extends { error: unknown }>(result: T, what: string) {
  if (result.error) throw new Error(`${what}: ${JSON.stringify(result.error)}`)
  return result
}

async function saveBatch(batch: ReturnType<typeof parseBatch>, origin: string) {
  const db = supabase()
  const { deviceId } = batch
  check(
    await db.from('devices').upsert({ device_id: deviceId, last_seen: new Date().toISOString(), app_version: batch.appVersion, origin }),
    'devices',
  )
  if (batch.learners.length) check(await db.from('learners').upsert(batch.learners), 'learners')
  if (batch.entries.length) {
    check(await db.from('entries').upsert(batch.entries), 'entries')
    // A photo removed in an edit: delete the old file. Missing files are fine.
    const gone = batch.entries.filter((e) => !e.photo_path).map((e) => photoPath(deviceId, e.local_id))
    if (gone.length) check(await db.storage.from(BUCKET).remove(gone), 'remove photos')
  }

  // Soft deletes: keep the row with deleted_at for the record, but blank the
  // personal text and delete the photo, as the app promises.
  const now = new Date().toISOString()
  const ids = (table: string) => batch.deletes.filter((d) => d.table === table).map((d) => d.localId)
  const learnerIds = ids('learners')
  const entryIds = ids('entries')
  if (learnerIds.length) {
    check(
      await db.from('learners').update({ deleted_at: now, name: '', plant: '' }).eq('device_id', deviceId).in('local_id', learnerIds),
      'delete learners',
    )
  }
  if (entryIds.length) {
    check(
      await db.from('entries').update({ deleted_at: now, note: '', photo_path: null }).eq('device_id', deviceId).in('local_id', entryIds),
      'delete entries',
    )
    check(await db.storage.from(BUCKET).remove(entryIds.map((id) => photoPath(deviceId, id))), 'remove photos')
  }
}

async function savePhoto(url: URL, bytes: Uint8Array) {
  const deviceId = url.searchParams.get('device') ?? ''
  const entry = Number(url.searchParams.get('entry'))
  if (!UUID.test(deviceId)) throw new BadRequest('device must be a UUID')
  int(entry, 'entry')
  if ([...url.searchParams.keys()].some((k) => k !== 'device' && k !== 'entry')) throw new BadRequest('unknown query parameters')
  if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) throw new BadRequest('photo must be under 2 MB')
  // JPEG files start with FF D8 FF.
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new BadRequest('photo must be a JPEG')
  check(
    await supabase().storage.from(BUCKET).upload(photoPath(deviceId, entry), bytes, { contentType: 'image/jpeg', upsert: true }),
    'upload photo',
  )
}

/* ---------- HTTP ---------- */

/**
 * The site calling us, as stored in devices.origin. Cross-origin calls must
 * come from ALLOWED_ORIGINS; same-origin calls (any Vercel deployment,
 * including previews) are always fine.
 */
function siteOf(request: Request): string | null {
  const origin = request.headers.get('origin')
  if (!origin) return null
  const own = `https://${request.headers.get('x-forwarded-host') ?? request.headers.get('host')}`
  if (origin !== own && !ALLOWED_ORIGINS.has(origin)) return null
  const host = new URL(origin).hostname
  if (host.endsWith('github.io')) return 'github-pages'
  if (host.endsWith('vercel.app')) return 'vercel'
  if (host === 'localhost') return 'local'
  return host
}

function cors(request: Request): Record<string, string> {
  const origin = request.headers.get('origin')
  if (!origin || !siteOf(request)) return { Vary: 'Origin' }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

const reply = (request: Request, status: number, body: Rec) =>
  Response.json(body, { status, headers: { ...cors(request), 'Cache-Control': 'no-store' } })

export function OPTIONS(request: Request) {
  if (!siteOf(request)) return new Response(null, { status: 403, headers: { Vary: 'Origin' } })
  return new Response(null, { status: 204, headers: cors(request) })
}

export async function POST(request: Request) {
  const site = siteOf(request)
  if (!site) return reply(request, 403, { error: 'origin not allowed' })
  const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  const declared = Number(request.headers.get('content-length') ?? 0)
  try {
    if (type === 'image/jpeg') {
      if (declared > MAX_PHOTO_BYTES) return reply(request, 413, { error: 'photo must be under 2 MB' })
      await savePhoto(new URL(request.url), new Uint8Array(await request.arrayBuffer()))
    } else if (type === 'application/json') {
      if (declared > MAX_JSON_BYTES) return reply(request, 413, { error: 'body too large' })
      const text = await request.text()
      if (text.length > MAX_JSON_BYTES) return reply(request, 413, { error: 'body too large' })
      let body: unknown
      try {
        body = JSON.parse(text)
      } catch {
        throw new BadRequest('body must be JSON')
      }
      await saveBatch(parseBatch(body), site)
    } else {
      return reply(request, 415, { error: 'send application/json or image/jpeg' })
    }
    return reply(request, 200, { ok: true })
  } catch (err) {
    if (err instanceof BadRequest) return reply(request, 400, { error: err.message })
    console.error(err)
    return reply(request, 500, { error: 'could not save' })
  }
}
