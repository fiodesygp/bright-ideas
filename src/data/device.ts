import { db, dbWasCreated } from './db'

const KEY = 'bright-ideas:deviceId'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

let pending: Promise<string> | undefined

/**
 * A random id for this browser, made once. The server files every learner,
 * entry and photo under it. It is kept in localStorage with a copy in
 * IndexedDB, so it survives if one of the two is cleared.
 */
export function getDeviceId() {
  pending ??= resolve().catch((err) => {
    pending = undefined
    throw err
  })
  return pending
}

async function resolve() {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(KEY)
  } catch {
    // Storage blocked; the IndexedDB copy still works.
  }
  const copy = (await db.meta.get('deviceId'))?.value
  // If IndexedDB was just created but localStorage still has an id, the
  // database was wiped. Its learner and entry ids start again at 1, so reusing
  // the old device id would overwrite that device's rows on the server.
  const id = [copy, dbWasCreated() ? null : saved].find((v): v is string => !!v && UUID.test(v)) ?? crypto.randomUUID()
  if (copy !== id) await db.meta.put({ key: 'deviceId', value: id })
  try {
    if (saved !== id) localStorage.setItem(KEY, id)
  } catch {
    // ignore
  }
  return id
}
