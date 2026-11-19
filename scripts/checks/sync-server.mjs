// Local stand-ins for checking the upload sync without a real Supabase project:
//
//  - a fake Supabase (just the REST and Storage calls api/sync.ts makes),
//    keeping tables and photos in memory, on port 54321
//  - api/sync.ts itself, served on port 5180 the way Vercel would call it
//
// Used by sync.mjs. To poke at it by hand, run it directly:
//   node scripts/checks/sync-server.mjs
// then build the app with VITE_SYNC_URL=http://localhost:5180/api/sync and
// serve it on port 5173 (the only localhost origin the endpoint allows).
import http from 'node:http'

export const SUPABASE_PORT = 54321
export const API_PORT = 5180
export const API_URL = `http://localhost:${API_PORT}/api/sync`

/** What the fake Supabase holds: rows by table, photos by path, and a log of uploads. */
export const store = { devices: new Map(), learners: new Map(), entries: new Map(), photos: new Map(), uploads: [], unknown: [] }

const rowKey = (table, row) => (table === 'devices' ? row.device_id : `${row.device_id}/${row.local_id}`)

const readBody = (req) =>
  new Promise((resolve) => {
    const parts = []
    req.on('data', (c) => parts.push(c))
    req.on('end', () => resolve(Buffer.concat(parts)))
  })

// PostgREST filters: ?device_id=eq.X&local_id=in.(1,2)
function matches(row, params) {
  for (const [col, cond] of params) {
    if (col === 'select' || col === 'on_conflict' || col === 'columns') continue
    const [op, ...rest] = cond.split('.')
    const value = rest.join('.')
    if (op === 'eq' && String(row[col]) !== value) return false
    if (op === 'in' && !value.slice(1, -1).split(',').includes(String(row[col]))) return false
  }
  return true
}

async function fakeSupabase(req, res) {
  const url = new URL(req.url, `http://localhost:${SUPABASE_PORT}`)
  const body = await readBody(req)
  const send = (status, json) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(json === undefined ? '' : JSON.stringify(json))
  }
  const auth = req.headers.apikey
  if (!auth?.startsWith('sb_secret_')) return send(401, { message: 'secret key expected' })

  const rest = url.pathname.match(/^\/rest\/v1\/(\w+)$/)
  if (rest && store[rest[1]] instanceof Map) {
    const table = store[rest[1]]
    if (req.method === 'POST') {
      // supabase-js upsert: merge each row into the one with the same key.
      const rows = [].concat(JSON.parse(body.toString()))
      for (const row of rows) {
        const key = rowKey(rest[1], row)
        const old = table.get(key)
        table.set(key, { ...(old ?? (rest[1] === 'devices' ? { first_seen: new Date().toISOString() } : {})), ...row })
      }
      return send(201)
    }
    if (req.method === 'PATCH') {
      const patch = JSON.parse(body.toString())
      for (const [key, row] of table) if (matches(row, url.searchParams)) table.set(key, { ...row, ...patch })
      return send(204)
    }
  }

  const object = url.pathname.match(/^\/storage\/v1\/object\/log-photos\/(.+)$/)
  if (object && (req.method === 'POST' || req.method === 'PUT')) {
    const path = decodeURIComponent(object[1])
    store.photos.set(path, body)
    store.uploads.push(path)
    return send(200, { Key: `log-photos/${path}`, Id: path })
  }
  if (url.pathname === '/storage/v1/object/log-photos' && req.method === 'DELETE') {
    const { prefixes } = JSON.parse(body.toString())
    const removed = prefixes.filter((p) => store.photos.delete(p))
    return send(200, removed.map((name) => ({ name })))
  }

  store.unknown.push(`${req.method} ${url.pathname}${url.search}`)
  send(404, { message: 'not faked' })
}

/** Serves api/sync.ts on Node's http server, passing Web Requests the way Vercel does. */
async function apiServer() {
  process.env.SUPABASE_URL = `http://localhost:${SUPABASE_PORT}`
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_local_check_only'
  const handlers = await import('../../api/sync.ts')
  return http.createServer(async (req, res) => {
    const url = `http://localhost:${API_PORT}${req.url}`
    const handler = handlers[req.method]
    if (!new URL(url).pathname.startsWith('/api/sync') || !handler) {
      res.writeHead(405).end()
      return
    }
    const body = req.method === 'POST' ? await readBody(req) : undefined
    const request = new Request(url, { method: req.method, headers: req.headers, body })
    const response = await handler(request)
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(Buffer.from(await response.arrayBuffer()))
  })
}

/** Starts both servers. Returns a function that stops them. */
export async function startServers() {
  const supabase = http.createServer(fakeSupabase)
  const api = await apiServer()
  await Promise.all([
    new Promise((r) => supabase.listen(SUPABASE_PORT, r)),
    new Promise((r) => api.listen(API_PORT, r)),
  ])
  return () => Promise.all([supabase, api].map((s) => new Promise((r) => s.close(r))))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await startServers()
  console.log(`Fake Supabase on :${SUPABASE_PORT}, sync endpoint at ${API_URL}. Ctrl+C to stop.`)
}
