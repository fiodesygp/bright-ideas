// Checks the upload sync end to end against a fake Supabase (sync-server.mjs):
// backfill of data saved by the previous version, the device id, offline save
// then upload on reconnect, edit re-upload (photo only when it changed),
// entry and learner deletes, Clear all data, the status line and its
// announcements, axe, the endpoint's checks on what it accepts, and the
// rate limit (429 with Retry-After; the client waits and retries).
// Sun Day: run upload, runs deleted with their learner and by Clear all data,
// the endpoint's checks on runs, and the v3 → v4 upgrade keeping queued records.
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
/** Runs one Sun Day for the current learner, without the animation. */
async function sunDayRun(p, guess = 'More') {
  await p.goto(BASE + '#/sun-day')
  await p.waitForSelector('.sd-scene')
  await p.emulateMedia({ reducedMotion: 'reduce' })
  await p.getByRole('radio', { name: guess, exact: true }).check()
  await p.getByRole('button', { name: 'Run the day', exact: true }).last().click()
  await p.waitForSelector('.sd-results')
  await p.emulateMedia({ reducedMotion: 'no-preference' })
}
const said = (page, text, timeout = 6000) =>
  page.waitForFunction((t) => document.getElementById('announcer')?.textContent === t, text, { timeout }).then(() => true, () => false)

async function axe(page, label) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  ok(r.violations.length === 0, `axe ${label}: ${r.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target).join(', ')})`).join('; ') || '0 violations'}`)
}

// The handler runs in this process and reads its rate limit per request.
// The browser has no client IP header here, so all its uploads share one
// bucket: keep the limit out of the way except where it is being tested.
const setLimit = (n) => { process.env.SYNC_RATE_LIMIT_PER_MINUTE = String(n) }
setLimit(10_000)
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

  // Sun Day runs
  const run = {
    localId: 1, learnerId: 1, createdAt: Date.now(), design: { crop: 'basil', weather: 'october', days: 1, panels: 'big', height: 'low', fan: true, pump: false },
    challenge: null, guess: 'more', why: 'fan', actual: 'same', score: 128, fullSun: 57, food: 61, energy: 67,
  }
  const withRun = (over, design = {}) => post({ ...base, sunDayRuns: [{ ...run, ...over, design: { ...run.design, ...design } }] })
  ok((await withRun({ note: 'x' })).status === 400, 'endpoint: unknown run field → 400')
  ok((await withRun({}, { tilt: 30 })).status === 400, 'endpoint: unknown design field → 400')
  ok((await withRun({}, { crop: 'tomato' })).status === 400, 'endpoint: crop not in model.json → 400')
  ok((await withRun({}, { height: 'mid' })).status === 400, 'endpoint: height "mid" (tuning only) → 400')
  ok((await withRun({}, { days: 3 })).status === 400, 'endpoint: 3 days → 400')
  ok((await withRun({ challenge: 'moon' })).status === 400, 'endpoint: unknown challenge → 400')
  ok((await withRun({ why: 'because' })).status === 400, 'endpoint: free-text reason → 400')
  ok((await withRun({ score: 201 })).status === 400 && (await withRun({ food: -1 })).status === 400 && (await withRun({ energy: 50.5 })).status === 400, 'endpoint: scores out of range or not whole → 400')
  ok((await withRun({ learnerId: null })).status === 400, 'endpoint: run without a learner → 400')
  ok(store.sun_day_runs.size === 0, 'endpoint: no refused run stored')
  ok((await withRun({ challenge: 'heat', guess: null, why: null }, { crop: 'chili', panels: 'none' })).status === 200, 'endpoint: valid run → 200')
  const saved = store.sun_day_runs.get(`${dev}/1`)
  ok(saved?.crop === 'chili' && saved.panels === 'none' && saved.fan === true && saved.challenge === 'heat' && saved.guess === null && saved.score === 128 && saved.full_sun === 57 && saved.learner_local_id === 1, 'endpoint: run columns stored')
  ok((await post({ ...base, deletes: [{ table: 'sunDayRuns', localId: 1 }] })).status === 200 && !!store.sun_day_runs.get(`${dev}/1`)?.deleted_at, 'endpoint: run delete sets deleted_at')
  ok((await post({ ...base, deletes: [{ table: 'photos', localId: 1 }] })).status === 400, 'endpoint: delete from an unknown table → 400')
  ok((await post({ ...base, learners: [{ localId: 2, name: 'Old', plant: '', startDate: '' }] })).status === 200, 'endpoint: a batch from the previous app version (no sunDayRuns) → 200')
  store.sun_day_runs.clear()

  // Rate limit: per IP, 429 with Retry-After once over the limit.
  setLimit(3)
  const asIp = (ip) => post(base, { ...O, 'X-Real-IP': ip })
  const firstThree = await Promise.all([1, 2, 3].map(() => asIp('203.0.113.9')))
  ok(firstThree.every((r) => r.status === 200), 'rate limit: first 3 requests in a minute → 200')
  const over = await asIp('203.0.113.9')
  const after = Number(over.headers.get('retry-after'))
  ok(over.status === 429 && after > 0 && after <= 60, `rate limit: 4th → 429, Retry-After ${after} s`)
  ok(over.headers.get('access-control-allow-origin') === O.Origin && /retry-after/i.test(over.headers.get('access-control-expose-headers') ?? ''), 'rate limit: 429 carries CORS and exposes Retry-After')
  ok((await asIp('198.51.100.7')).status === 200, 'rate limit: another IP is not affected')
  setLimit(10_000)
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

// Rate limited: the entry waits as asked and goes up on the next try.
const warnings = []
page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()))
setLimit(0)
await page.getByLabel(/Plant height/).fill('6.8')
await page.getByRole('button', { name: 'Save entry' }).click()
await page.waitForFunction(() => document.querySelector('.sync-status')?.textContent.trim() === '1 waiting to upload')
ok(await until(() => warnings.some((w) => /trying again in (\d+) s/.test(w))), 'rate limited: client schedules a retry')
const retryIn = Number(warnings.find((w) => /trying again in/.test(w))?.match(/in (\d+) s/)[1])
ok(retryIn > 5, `rate limited: waits as the server asked (${retryIn} s, not the 5 s first backoff)`)
ok(!rows('entries', deviceId).some((e) => Number(e.height) === 6.8), 'rate limited: nothing stored')
const queued = await page.evaluate(() => new Promise((res) => {
  const q = indexedDB.open('bright-ideas')
  q.onsuccess = () => { const g = q.result.transaction('entries').objectStore('entries').getAll(); g.onsuccess = () => { res(g.result.find((e) => e.height === 6.8)); q.result.close() } }
}))
ok(queued?.dirty === 1 && !queued.syncedAt, 'rate limited: entry stays queued, not dropped')
setLimit(10_000)
await page.evaluate(() => window.dispatchEvent(new Event('online')))
ok(await until(() => rows('entries', deviceId).some((e) => Number(e.height) === 6.8)), 'rate limit lifted: queued entry uploaded')
await page.waitForFunction(() => document.querySelector('.sync-status')?.textContent.trim() === 'All entries uploaded', null, { timeout: 5000 }).catch(() => {})
ok((await status(page)) === 'All entries uploaded', 'rate limit lifted: status back to "All entries uploaded"')

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

/* ---------- Sun Day run upload ---------- */
await sunDayRun(page)
await page.waitForSelector('.sd-run')
ok(await until(() => rows('sun_day_runs', deviceId).length === 1), 'Sun Day: run uploaded')
const rosaRun = rows('sun_day_runs', deviceId)[0]
ok(rosaRun?.learner_local_id === 1 && rosaRun.crop && rosaRun.guess === 'more' && Number.isInteger(rosaRun.score) && !rosaRun.deleted_at, 'Sun Day: run fields arrive, filed under the current learner')
ok(Object.keys(rosaRun ?? {}).every((k) => ['device_id', 'local_id', 'learner_local_id', 'crop', 'weather', 'days', 'panels', 'height', 'fan', 'pump', 'challenge', 'guess', 'why', 'actual', 'score', 'full_sun', 'food', 'energy', 'created_at', 'updated_at', 'deleted_at'].includes(k)), 'Sun Day: only the known columns are sent')
await page.goto(BASE + '#/log')
await page.waitForFunction(() => document.querySelector('.sync-status')?.textContent.trim() === 'All entries uploaded', null, { timeout: 5000 }).catch(() => {})
ok((await status(page)) === 'All entries uploaded', 'Sun Day: status "All entries uploaded" once the run is up')

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
await sunDayRun(page, 'Less')
ok(await until(() => rows('sun_day_runs', deviceId).some((r) => r.learner_local_id === sam.local_id)), "second learner: Sam's Sun Day run uploaded")
await page.goto(BASE + '#/log')
await page.getByRole('button', { name: /^Edit Sam's/ }).click()
await page.getByRole('button', { name: "Delete Sam's log" }).click()
await page.getByRole('dialog', { name: "Delete Sam's log?" }).getByRole('button', { name: 'Delete' }).click()
ok(await until(() => store.learners.get(`${deviceId}/${sam.local_id}`)?.deleted_at), 'learner delete: deleted_at set')
ok(store.learners.get(`${deviceId}/${sam.local_id}`).name === '', 'learner delete: name blanked on the server')
const samEntry = rows('entries', deviceId).find((e) => e.learner_local_id === sam.local_id)
ok(!!samEntry?.deleted_at && samEntry.note === '', "learner delete: their entry deleted and note blanked")
ok(!rosa.deleted_at && !store.learners.get(`${deviceId}/1`).deleted_at, 'learner delete: the other learner stays')
ok(await until(() => rows('sun_day_runs', deviceId).find((r) => r.learner_local_id === sam.local_id)?.deleted_at), "learner delete: their Sun Day run marked deleted on the server")
ok(!rows('sun_day_runs', deviceId).find((r) => r.learner_local_id === 1).deleted_at, "learner delete: the other learner's run stays")

/* ---------- Clear all data ---------- */
await page.goto(BASE + '#/settings')
await page.getByRole('button', { name: 'Clear all data' }).click()
await page.getByRole('dialog').getByRole('button', { name: 'Yes, clear everything' }).click()
ok(await until(() => rows('learners', deviceId).every((l) => l.deleted_at) && rows('entries', deviceId).every((e) => e.deleted_at)), 'clear all: every learner and entry deleted on the server')
ok(rows('learners', deviceId).every((l) => l.name === '') && rows('entries', deviceId).every((e) => e.note === ''), 'clear all: names and notes blanked')
ok(await until(() => rows('sun_day_runs', deviceId).length === 2 && rows('sun_day_runs', deviceId).every((r) => r.deleted_at)), 'clear all: every Sun Day run marked deleted on the server')
ok(await page.evaluate(() => new Promise((res) => {
  const q = indexedDB.open('bright-ideas')
  q.onsuccess = () => { const c = q.result.transaction('sunDayRuns').objectStore('sunDayRuns').count(); c.onsuccess = () => { res(c.result === 0); q.result.close() } }
})), 'clear all: no Sun Day runs left on the device')
ok(![...store.photos.keys()].some((p) => p.startsWith(deviceId)), "clear all: the device's photos removed")
ok((await page.evaluate(() => localStorage.getItem('bright-ideas:deviceId'))) === deviceId, 'clear all: device id kept')
await page.goto(BASE + '#/log')
await page.waitForSelector('form.about-form')
ok((await status(page)) === 'All entries uploaded', 'clear all: status back to "All entries uploaded"')
ok(errs.length === 0, `no page errors ${errs.join('; ')}`)
ok(store.unknown.length === 0, `fake Supabase saw only expected calls ${store.unknown.join(', ')}`)

/* ---------- Backfill: data saved by the first version (Dexie v1, entries only) ---------- */
{
  const v1 = await browser.newContext({ viewport: { width: 360, height: 900 } })
  const p1 = await v1.newPage()
  const blank1 = new URL('check-blank.html', BASE).href
  await p1.route(blank1, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>blank</title>' }))
  await p1.goto(blank1)
  const photo1 = await makePhoto(p1)
  await p1.evaluate(async (b64) => {
    const photo = new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'image/jpeg' })
    await new Promise((resolve, reject) => {
      const q = indexedDB.open('bright-ideas', 10) // Dexie version 1 = IndexedDB version 10
      q.onupgradeneeded = () => {
        const e = q.result.createObjectStore('entries', { keyPath: 'id', autoIncrement: true })
        e.createIndex('plantId', 'plantId'); e.createIndex('date', 'date'); e.createIndex('createdAt', 'createdAt')
        e.createIndex('[plantId+date]', ['plantId', 'date'])
      }
      q.onsuccess = () => {
        const tx = q.result.transaction('entries', 'readwrite')
        // The first version's full entry shape.
        tx.objectStore('entries').add({ plantId: 1, date: '2026-09-20', createdAt: Date.parse('2026-09-20T10:00:00Z'), height: 1.5, heightUnit: 'cm', heightCm: 1.5, leafCount: 2, leafColor: 'green', soil: 'damp', watered: true, weather: 'sunny', shade: '', note: 'v1 entry', promptId: '', promptText: '', reflection: '', photo })
        tx.objectStore('entries').add({ plantId: 1, date: '2026-09-22', createdAt: Date.parse('2026-09-22T10:00:00Z'), height: 2, heightUnit: 'cm', heightCm: 2, leafCount: null, leafColor: '', soil: '', watered: null, weather: '', shade: '', note: '', promptId: '', promptText: '', reflection: '' })
        tx.oncomplete = () => { q.result.close(); resolve() }
        tx.onerror = reject
      }
      q.onerror = reject
    })
  }, photo1.buffer.toString('base64'))
  await p1.goto(BASE + '#/log')
  await p1.waitForSelector('form.about-form')
  const dev1 = await p1.evaluate(() => localStorage.getItem('bright-ideas:deviceId'))
  ok(await until(() => rows('entries', dev1).length === 2), 'v1 backfill: both first-version entries uploaded before anyone adds a name')
  const first = store.entries.get(`${dev1}/1`)
  ok(first?.watered === true && first.note === 'v1 entry' && first.learner_local_id === null && store.photos.has(`${dev1}/1.jpg`), 'v1 backfill: fields and photo arrive, no learner yet')
  // Adding the first learner adopts them; the change is uploaded too.
  await startLog(p1, 'Vic')
  ok(await until(() => rows('entries', dev1).every((e) => e.learner_local_id === 1) && rows('learners', dev1)[0]?.name === 'Vic'), 'v1 backfill: entries re-uploaded with the first learner after adoption')
  await v1.close()
}

/* ---------- Upgrade from Dexie v3 (before Sun Day) keeps what is still queued ---------- */
{
  const v3 = await browser.newContext({ viewport: { width: 360, height: 900 } })
  const p3 = await v3.newPage()
  const blank3 = new URL('check-blank.html', BASE).href
  await p3.route(blank3, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>blank</title>' }))
  await p3.goto(blank3)
  const photo3 = await makePhoto(p3)
  await p3.evaluate(async (b64) => {
    const photo = new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'image/jpeg' })
    await new Promise((resolve, reject) => {
      const q = indexedDB.open('bright-ideas', 30) // Dexie version 3 = IndexedDB version 30
      q.onupgradeneeded = () => {
        const db = q.result
        const l = db.createObjectStore('learners', { keyPath: 'id', autoIncrement: true })
        l.createIndex('dirty', 'dirty')
        const e = db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true })
        e.createIndex('plantId', 'plantId'); e.createIndex('date', 'date'); e.createIndex('createdAt', 'createdAt')
        e.createIndex('[plantId+date]', ['plantId', 'date']); e.createIndex('dirty', 'dirty')
        const t = db.createObjectStore('tombstones', { keyPath: 'id', autoIncrement: true })
        t.createIndex('table', 'table'); t.createIndex('localId', 'localId')
        db.createObjectStore('meta', { keyPath: 'key' })
      }
      q.onsuccess = () => {
        const tx = q.result.transaction(['learners', 'entries', 'tombstones', 'meta'], 'readwrite')
        const now = Date.now()
        tx.objectStore('meta').put({ key: 'deviceId', value: '3a3a3a3a-0000-4000-8000-000000000003' })
        // Uploaded before: no dirty mark.
        tx.objectStore('learners').add({ name: 'Uma', plant: 'Lettuce', startDate: '2026-11-01', syncedAt: now - 60_000 })
        tx.objectStore('entries').add({ plantId: 1, learnerId: 1, date: '2026-11-02', createdAt: now - 120_000, height: 3, heightUnit: 'cm', heightCm: 3, note: 'Already up', syncedAt: now - 60_000 })
        // Saved by v3 while offline: still queued, one with a photo, one deleted.
        tx.objectStore('learners').add({ name: 'Ian', plant: '', startDate: '', dirty: 1 })
        tx.objectStore('entries').add({ plantId: 1, learnerId: 1, date: '2026-11-03', createdAt: now - 30_000, height: 4, heightUnit: 'cm', heightCm: 4, note: 'Queued in v3', soilChecked: true, watered: false, photo, dirty: 1, photoDirty: 1 })
        tx.objectStore('entries').add({ plantId: 1, learnerId: 2, date: '2026-11-03', createdAt: now - 20_000, height: 2, heightUnit: 'in', heightCm: 5.08, note: "Ian's queued", dirty: 1 })
        tx.objectStore('tombstones').add({ table: 'entries', localId: 9, deletedAt: now - 10_000 })
        tx.oncomplete = () => { q.result.close(); resolve() }
        tx.onerror = reject
      }
      q.onerror = reject
    })
  }, photo3.buffer.toString('base64'))
  // Keep the old device id in localStorage too, as v3 would have.
  await p3.evaluate(() => localStorage.setItem('bright-ideas:deviceId', '3a3a3a3a-0000-4000-8000-000000000003'))
  const dev3 = '3a3a3a3a-0000-4000-8000-000000000003'
  await p3.goto(BASE + '#/log')
  await p3.waitForSelector('.learner-bar')
  ok(await until(() => rows('entries', dev3).length === 2 && rows('learners', dev3).length === 1), 'v3 → v4: both queued entries and the queued learner uploaded')
  ok(!store.entries.get(`${dev3}/1`) && !store.learners.get(`${dev3}/1`), 'v3 → v4: records already uploaded are not sent again')
  ok(store.entries.get(`${dev3}/2`)?.note === 'Queued in v3' && store.entries.get(`${dev3}/2`).soil_checked === true && store.photos.get(`${dev3}/2.jpg`)?.length === photo3.buffer.length, 'v3 → v4: queued entry fields and photo arrive')
  ok(store.learners.get(`${dev3}/2`)?.name === 'Ian' && store.entries.get(`${dev3}/3`)?.learner_local_id === 2, "v3 → v4: queued learner and their entry arrive")
  await p3.waitForFunction(() => document.querySelector('.sync-status')?.textContent.trim() === 'All entries uploaded', null, { timeout: 15000 }).catch(() => {})
  const after3 = await p3.evaluate(() => new Promise((res) => {
    const q = indexedDB.open('bright-ideas')
    q.onsuccess = () => {
      const db = q.result
      const out = { version: db.version, stores: [...db.objectStoreNames] }
      const tx = db.transaction(['entries', 'learners', 'tombstones', 'sunDayRuns'])
      tx.objectStore('entries').getAll().onsuccess = (e) => { out.entries = e.target.result.map((x) => ({ id: x.id, dirty: x.dirty, photoDirty: x.photoDirty, hasPhoto: !!x.photo })) }
      tx.objectStore('learners').getAll().onsuccess = (e) => { out.learners = e.target.result.map((x) => ({ id: x.id, dirty: x.dirty, name: x.name })) }
      tx.objectStore('tombstones').count().onsuccess = (e) => { out.tombstones = e.target.result }
      tx.objectStore('sunDayRuns').count().onsuccess = (e) => { out.runs = e.target.result }
      tx.oncomplete = () => { db.close(); res(out) }
    }
  }))
  ok(after3.version === 40 && after3.stores.includes('sunDayRuns'), `v3 → v4: database upgraded to v4 with a sunDayRuns table (IndexedDB version ${after3.version})`)
  ok(after3.entries.length === 3 && after3.learners.length === 2 && after3.entries.find((e) => e.id === 2)?.hasPhoto, 'v3 → v4: every learner, entry and photo kept on the device')
  ok(after3.entries.every((e) => !e.dirty && !e.photoDirty) && after3.learners.every((l) => !l.dirty) && after3.tombstones === 0, 'v3 → v4: queue empty once uploaded (dirty cleared, tombstone sent)')
  ok(after3.runs === 0, 'v3 → v4: no Sun Day runs invented')
  await v3.close()
}

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
