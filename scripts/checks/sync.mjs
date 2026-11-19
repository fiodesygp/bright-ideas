// Checks the upload sync end to end against a fake Supabase (sync-server.mjs):
// backfill of data saved by the previous version, the device id, offline save
// then upload on reconnect, edit re-upload (photo only when it changed),
// entry and learner deletes, Clear all data, the status line and its
// announcements, axe, and the endpoint's checks on what it accepts.
//
// The app must be built to post to the local endpoint and served on port 5173:
//   VITE_SYNC_URL=http://localhost:5180/api/sync npm run build
//   npx vite preview --port 5173 --strictPort
// usage: see README, "Optional browser checks"
import { APP_URL as BASE, AxeBuilder, chromium, makePhoto, startLog } from './deps.mjs'
import { API_URL, startServers, store } from './sync-server.mjs'

let fails = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
/** Waits up to 15 s for a condition on the fake Supabase. */
async function until(fn, ms = 15_000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (fn()) return true
    await new Promise((r) => setTimeout(r, 100))
  }
  return false
}
const rows = (table, deviceId) => [...store[table].values()].filter((r) => r.device_id === deviceId)
const status = (page) => page.locator('.sync-status').innerText()
const said = (page, text, timeout = 6000) =>
  page.waitForFunction((t) => document.getElementById('announcer')?.textContent === t, text, { timeout }).then(() => true, () => false)

async function axe(page, label) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  ok(r.violations.length === 0, `axe ${label}: ${r.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target).join(', ')})`).join('; ') || '0 violations'}`)
}

const stop = await startServers()
const browser = await chromium.launch()

/* ---------- The endpoint refuses what it should ---------- */
{
  const O = { Origin: 'http://localhost:5173' }
  const dev = '0f0f0f0f-0000-4000-8000-000000000000'
  const post = (body, headers = O, type = 'application/json') =>
    fetch(API_URL, { method: 'POST', headers: { ...headers, 'Content-Type': type }, body: type === 'application/json' ? JSON.stringify(body) : body })
  const base = { deviceId: dev, appVersion: 'check' }
  const entry = { localId: 1, learnerId: null, plantId: 1, date: '2026-11-01', height: 3, heightUnit: 'cm', heightCm: 3, note: '', soilChecked: null, watered: null, hasPhoto: false, createdAt: Date.now(), updatedAt: null }
  ok((await post({ ...base, extra: 1 })).status === 400, 'endpoint: unknown top-level field → 400')
  ok((await post({ ...base, entries: [{ ...entry, secret: 'x' }] })).status === 400, 'endpoint: unknown entry field → 400')
  ok((await post({ ...base, entries: [{ ...entry, note: 'x'.repeat(1001) }] })).status === 400, 'endpoint: note over 1000 characters → 400')
  ok((await post({ ...base, learners: [{ localId: 1, name: '', plant: '', startDate: '' }] })).status === 400, 'endpoint: empty name → 400')
  ok((await post({ ...base, deviceId: 'not-a-uuid' })).status === 400, 'endpoint: bad device id → 400')
  ok((await post({ ...base }, { Origin: 'https://evil.example' })).status === 403, 'endpoint: other origin → 403')
  ok((await post({ ...base }, {})).status === 403, 'endpoint: no origin → 403')
  ok((await post('x', O, 'text/plain')).status === 415, 'endpoint: other content type → 415')
  const photoUrl = `${API_URL}?device=${dev}&entry=1`
  const sendPhoto = (bytes) => fetch(photoUrl, { method: 'POST', headers: { ...O, 'Content-Type': 'image/jpeg' }, body: bytes })
  ok((await sendPhoto(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).status === 400, 'endpoint: PNG bytes sent as JPEG → 400')
  const big = new Uint8Array(2 * 1024 * 1024 + 1); big.set([0xff, 0xd8, 0xff])
  ok([400, 413].includes((await sendPhoto(big)).status), 'endpoint: photo over 2 MB → refused')
  const pre = await fetch(API_URL, { method: 'OPTIONS', headers: { ...O, 'Access-Control-Request-Method': 'POST' } })
  ok(pre.status === 204 && pre.headers.get('access-control-allow-origin') === O.Origin, 'endpoint: preflight from an allowed origin → 204 with CORS')
  const ghp = await fetch(API_URL, { method: 'OPTIONS', headers: { Origin: 'https://fiodesygp.github.io' } })
  ok(ghp.headers.get('access-control-allow-origin') === 'https://fiodesygp.github.io', 'endpoint: GitHub Pages origin allowed')
  ok((await fetch(API_URL, { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } })).status === 403, 'endpoint: preflight from another origin → 403')
  ok(rows('entries', dev).length === 0 && store.photos.size === 0, 'endpoint: nothing refused was stored')
}

/* ---------- Backfill: data saved by the previous version (Dexie v2) ---------- */
const ctx = await browser.newContext({ viewport: { width: 360, height: 900 } })
const page = await ctx.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
// A blank page on the app's origin, to write the old database before the app opens it.
const blank = new URL('check-blank.html', BASE).href
await page.route(blank, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>blank</title>' }))
await page.goto(blank)
const oldPhoto = await makePhoto(page)
await page.evaluate(async (b64) => {
  const photo = new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'image/jpeg' })
  await new Promise((resolve, reject) => {
    const q = indexedDB.open('bright-ideas', 20) // Dexie version 2 = IndexedDB version 20
    q.onupgradeneeded = () => {
      const e = q.result.createObjectStore('entries', { keyPath: 'id', autoIncrement: true })
      e.createIndex('plantId', 'plantId'); e.createIndex('date', 'date'); e.createIndex('createdAt', 'createdAt')
      e.createIndex('[plantId+date]', ['plantId', 'date'])
      q.result.createObjectStore('learners', { keyPath: 'id', autoIncrement: true })
    }
    q.onsuccess = () => {
      const tx = q.result.transaction(['entries', 'learners'], 'readwrite')
      tx.objectStore('learners').add({ name: 'Rosa', plant: 'Bean', startDate: '2026-10-01' })
      tx.objectStore('entries').add({ plantId: 1, learnerId: 1, date: '2026-10-05', createdAt: Date.parse('2026-10-05T10:00:00Z'), height: 2, heightUnit: 'cm', heightCm: 2, note: 'Old entry', soilChecked: true, photo })
      // From the first version: no learner, extra fields, watered: null.
      tx.objectStore('entries').add({ plantId: 1, date: '2026-10-01', createdAt: Date.parse('2026-10-01T10:00:00Z'), height: 1, heightUnit: 'in', heightCm: 2.54, note: 'MVP', leafCount: 2, soil: 'damp', watered: null })
      tx.oncomplete = () => { q.result.close(); resolve() }
      tx.onerror = reject
    }
    q.onerror = reject
  })
}, oldPhoto.buffer.toString('base64'))

await page.goto(BASE + '#/log')
await page.waitForSelector('.learner-bar')
const deviceId = await page.evaluate(() => localStorage.getItem('bright-ideas:deviceId'))
ok(/^[0-9a-f-]{36}$/.test(deviceId ?? ''), `device id made and kept in localStorage (${deviceId})`)
ok(await until(() => rows('entries', deviceId).length === 2 && rows('learners', deviceId).length === 1), 'backfill: old learner and both old entries uploaded')
const rosa = rows('learners', deviceId)[0]
ok(rosa?.name === 'Rosa' && rosa.plant === 'Bean' && rosa.start_date === '2026-10-01', 'backfill: learner fields arrive')
const old1 = store.entries.get(`${deviceId}/1`)
ok(old1?.learner_local_id === 1 && old1.note === 'Old entry' && old1.soil_checked === true && old1.watered === null && old1.photo_path === `${deviceId}/1.jpg`, 'backfill: entry fields arrive, with photo path')
const mvp = store.entries.get(`${deviceId}/2`)
ok(mvp?.learner_local_id === null && mvp.height_unit === 'in' && !('leafCount' in mvp) && !('soil' in mvp), 'backfill: first-version entry arrives without its extra fields')
ok(store.photos.get(`${deviceId}/1.jpg`)?.length === oldPhoto.buffer.length, 'backfill: old photo uploaded byte for byte')
ok(rows('devices', deviceId)[0]?.origin === 'local', 'device row says where it came from')
await page.waitForFunction(() => document.querySelector('.sync-status')?.textContent.trim() === 'All entries uploaded', null, { timeout: 5000 }).catch(() => {})
ok((await status(page)) === 'All entries uploaded', `status after backfill: "${await status(page)}"`)
const left = await page.evaluate(() => new Promise((res) => {
  const q = indexedDB.open('bright-ideas')
  q.onsuccess = () => {
    const tx = q.result.transaction(['entries', 'learners', 'meta'])
    const out = {}
    tx.objectStore('entries').getAll().onsuccess = (e) => { out.entries = e.target.result }
    tx.objectStore('learners').getAll().onsuccess = (e) => { out.learners = e.target.result }
    tx.objectStore('meta').get('deviceId').onsuccess = (e) => { out.meta = e.target.result }
    tx.oncomplete = () => { q.result.close(); res(out) }
  }
}))
ok([...left.entries, ...left.learners].every((r) => !r.dirty && r.syncedAt && !r.photoDirty), 'backfill: records no longer dirty, syncedAt set')
ok(left.entries.find((e) => e.id === 2)?.leafCount === 2, 'backfill: local data shape unchanged (old fields kept)')
ok(left.meta?.value === deviceId, 'device id copied to IndexedDB')

// Device id survives localStorage being cleared.
await page.evaluate(() => localStorage.removeItem('bright-ideas:deviceId'))
await page.reload()
await page.waitForSelector('.learner-bar')
await page.waitForFunction(() => localStorage.getItem('bright-ideas:deviceId'))
ok((await page.evaluate(() => localStorage.getItem('bright-ideas:deviceId'))) === deviceId, 'device id restored from IndexedDB after localStorage was cleared')
await axe(page, 'Log with "All entries uploaded"')

/* ---------- Offline save, then upload on reconnect ---------- */
const uploadsBefore = store.uploads.length
await ctx.setOffline(true)
await page.locator('.photo-drop input[type=file]').setInputFiles(await makePhoto(page))
await page.waitForSelector('.photo-preview img')
await page.getByLabel(/Plant height/).fill('6')
await page.getByLabel(/What happened/).fill('Saved while offline')
await page.getByRole('checkbox', { name: /^Water/ }).check()
await page.getByRole('button', { name: 'Save entry' }).click()
await page.waitForSelector('.entry-fresh')
ok(await said(page, 'Saved to your Planting Log!', 2000), 'offline: save still announces "Saved to your Planting Log!"')
await page.waitForFunction(() => document.querySelector('.sync-status')?.textContent.includes('Offline'))
ok((await status(page)) === 'Offline — will upload later', `offline: status "${await status(page)}"`)
ok(await said(page, 'Offline — will upload later'), 'offline: status change announced once it settles')
await axe(page, 'Log while offline')
await page.waitForTimeout(1500)
ok(!rows('entries', deviceId).some((e) => e.note === 'Saved while offline'), 'offline: nothing sent')
await ctx.setOffline(false)
ok(await until(() => rows('entries', deviceId).some((e) => e.note === 'Saved while offline')), 'reconnect: entry uploaded')
const offline = rows('entries', deviceId).find((e) => e.note === 'Saved while offline')
ok(offline?.watered === true && offline.soil_checked === false && offline.height === 6 && offline.learner_local_id === 1, 'reconnect: entry fields arrive')
ok(store.uploads.length === uploadsBefore + 1 && store.photos.has(offline?.photo_path), 'reconnect: its photo uploaded once')
ok(await said(page, 'All entries uploaded'), 'reconnect: "All entries uploaded" announced')

// Waiting state while the endpoint is down.
await page.route('**/api/sync**', (route) => route.fulfill({ status: 503, body: 'down' }))
await page.getByLabel(/Plant height/).fill('6.5')
await page.getByRole('button', { name: 'Save entry' }).click()
await page.waitForFunction(() => document.querySelector('.sync-status')?.textContent.trim() === '1 waiting to upload')
ok(true, 'endpoint down: status "1 waiting to upload"')
await page.unroute('**/api/sync**')
await page.evaluate(() => window.dispatchEvent(new Event('online')))
ok(await until(() => rows('entries', deviceId).some((e) => Number(e.height) === 6.5)), 'endpoint back: queued entry uploaded')

/* ---------- Edit re-upload ---------- */
await page.goto(BASE + '#/log/dashboard')
const offlineCard = page.locator('.entry', { hasText: 'Saved while offline' })
await offlineCard.getByRole('button', { name: /^Edit/ }).click()
await offlineCard.getByLabel(/What happened/).fill('Edited note')
const uploads = store.uploads.length
await offlineCard.getByRole('button', { name: 'Save changes' }).click()
ok(await until(() => store.entries.get(`${deviceId}/${offline.local_id}`)?.note === 'Edited note'), 'edit: new note uploaded')
await page.waitForTimeout(500)
ok(store.uploads.length === uploads, 'edit: unchanged photo not uploaded again')
const editedCard = page.locator('.entry', { hasText: 'Edited note' })
await editedCard.getByRole('button', { name: /^Edit/ }).click()
await editedCard.locator('.photo-preview input[type=file]').setInputFiles(await makePhoto(page))
await editedCard.getByRole('button', { name: 'Save changes' }).click()
ok(await until(() => store.uploads.length === uploads + 1), 'edit: changed photo uploaded again')
await editedCard.getByRole('button', { name: /^Edit/ }).click()
await editedCard.getByRole('button', { name: 'Remove photo' }).click()
await editedCard.getByRole('button', { name: 'Save changes' }).click()
ok(await until(() => store.entries.get(`${deviceId}/${offline.local_id}`)?.photo_path === null && !store.photos.has(offline.photo_path)), 'edit: removed photo deleted on the server')

/* ---------- Entry delete ---------- */
await page.locator('.entry', { hasText: 'Old entry' }).getByRole('button', { name: /^Delete/ }).click()
await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
ok(await until(() => store.entries.get(`${deviceId}/1`)?.deleted_at), 'entry delete: deleted_at set on the server')
const del = store.entries.get(`${deviceId}/1`)
ok(del.note === '' && del.photo_path === null && !store.photos.has(`${deviceId}/1.jpg`) && del.height === 2, 'entry delete: note blanked, photo removed, numbers kept')
ok(await page.evaluate(() => new Promise((res) => {
  const q = indexedDB.open('bright-ideas')
  q.onsuccess = () => { const c = q.result.transaction('tombstones').objectStore('tombstones').count(); c.onsuccess = () => { res(c.result === 0); q.result.close() } }
})), 'entry delete: tombstone cleared after the server confirmed')

/* ---------- Learner delete ---------- */
await page.goto(BASE + '#/log')
await page.getByRole('button', { name: "Who's logging?" }).click()
await page.getByRole('button', { name: '+ Add someone' }).click()
await page.locator('.learner-panel').getByLabel('My name').fill('Sam')
await page.locator('.learner-panel').getByRole('button', { name: 'Add to this device' }).click()
await page.waitForFunction(() => document.querySelector('.learner-bar > h2')?.textContent === "Sam's Planting Log")
await page.getByLabel(/Plant height/).fill('1')
await page.getByLabel(/What happened/).fill("Sam's entry")
await page.getByRole('button', { name: 'Save entry' }).click()
ok(await until(() => rows('entries', deviceId).some((e) => e.note === "Sam's entry")), 'second learner: entry uploaded')
const sam = rows('learners', deviceId).find((l) => l.name === 'Sam')
ok(!!sam, 'second learner: uploaded')
await page.getByRole('button', { name: /^Edit Sam's/ }).click()
await page.getByRole('button', { name: "Delete Sam's log" }).click()
await page.getByRole('dialog', { name: "Delete Sam's log?" }).getByRole('button', { name: 'Delete' }).click()
ok(await until(() => store.learners.get(`${deviceId}/${sam.local_id}`)?.deleted_at), 'learner delete: deleted_at set')
ok(store.learners.get(`${deviceId}/${sam.local_id}`).name === '', 'learner delete: name blanked on the server')
const samEntry = rows('entries', deviceId).find((e) => e.learner_local_id === sam.local_id)
ok(!!samEntry?.deleted_at && samEntry.note === '', "learner delete: their entry deleted and note blanked")
ok(!rosa.deleted_at && !store.learners.get(`${deviceId}/1`).deleted_at, 'learner delete: the other learner stays')

/* ---------- Clear all data ---------- */
await page.goto(BASE + '#/settings')
await page.getByRole('button', { name: 'Clear all data' }).click()
await page.getByRole('dialog').getByRole('button', { name: 'Yes, clear everything' }).click()
ok(await until(() => rows('learners', deviceId).every((l) => l.deleted_at) && rows('entries', deviceId).every((e) => e.deleted_at)), 'clear all: every learner and entry deleted on the server')
ok(rows('learners', deviceId).every((l) => l.name === '') && rows('entries', deviceId).every((e) => e.note === ''), 'clear all: names and notes blanked')
ok(![...store.photos.keys()].some((p) => p.startsWith(deviceId)), "clear all: the device's photos removed")
ok((await page.evaluate(() => localStorage.getItem('bright-ideas:deviceId'))) === deviceId, 'clear all: device id kept')
await page.goto(BASE + '#/log')
await page.waitForSelector('form.about-form')
ok((await status(page)) === 'All entries uploaded', 'clear all: status back to "All entries uploaded"')
ok(errs.length === 0, `no page errors ${errs.join('; ')}`)
ok(store.unknown.length === 0, `fake Supabase saw only expected calls ${store.unknown.join(', ')}`)

/* ---------- Status line in dark mode ---------- */
const dark = await browser.newContext({ viewport: { width: 360, height: 900 }, colorScheme: 'dark' })
const dp = await dark.newPage()
await dp.goto(BASE + '#/log')
await startLog(dp, 'Dee')
await dark.setOffline(true)
await dp.getByLabel(/Plant height/).fill('2')
await dp.getByRole('button', { name: 'Save entry' }).click()
await dp.waitForFunction(() => document.querySelector('.sync-status')?.textContent.includes('Offline'))
await dp.waitForTimeout(600)
await axe(dp, 'dark, offline status')
await dark.setOffline(false)

await browser.close()
await stop()
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
process.exitCode = fails ? 1 : 0
