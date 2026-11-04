// Checks "About my log" and shared devices at 360/768/1280 px in light and dark
// mode: a fresh device (name required, hint, start date today), two learners
// with their own entries, switching, renaming, checklist counts on the
// Dashboard, deleting one learner, and "Remove my name and log" in Settings.
// Also axe, 44px targets, sideways scrolling, announcements and focus.
// It saves screenshots to SHOTS_DIR (outside the repo by default) for a look.
//
// usage: see README, "Optional browser checks"
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { APP_URL as BASE, AxeBuilder, SHOTS_DIR, chromium, startLog } from './deps.mjs'

const SHOTS = SHOTS_DIR + path.sep
mkdirSync(SHOTS, { recursive: true })

let fails = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }

const said = (page, text) =>
  page.waitForFunction((t) => document.getElementById('announcer')?.textContent === t, text, { timeout: 3000 }).then(() => true, () => false)
const focused = (page, fn) => page.waitForFunction(fn, null, { timeout: 3000 }).then(() => true, () => false)
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function axe(page, label) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  ok(r.violations.length === 0, `axe ${label}: ${r.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target).join(', ')})`).join('; ') || '0 violations'}`)
}

async function checkLayout(page, label) {
  const { sw, cw, small } = await page.evaluate(() => {
    const els = [...document.querySelectorAll('main button, main input:not([type=checkbox]):not([type=radio]):not(.visually-hidden), main .check-toggle, main .btn')]
    const small = els
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.height < 44 || r.width < 44) })
      .map((e) => `${e.tagName}.${e.className} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`)
    return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, small }
  })
  ok(sw <= cw, `${label} no horizontal scroll (${sw}/${cw})`)
  ok(small.length === 0, `${label} targets ≥44px ${small.join(', ')}`)
}

async function addEntry(page, height, { soil = false, water = false, date } = {}) {
  if (date) await page.locator('.log-form input[type=date]').fill(date)
  await page.getByLabel(/Plant height/).fill(height)
  if (soil) await page.getByRole('checkbox', { name: /^Soil/ }).check()
  if (water) await page.getByRole('checkbox', { name: /^Water/ }).check()
  const before = await page.locator('.entry-fresh h3').getAttribute('id', { timeout: 100 }).catch(() => null)
  await page.getByRole('button', { name: 'Save entry' }).click()
  await page.waitForFunction((b) => { const h = document.querySelector('.entry-fresh h3'); return h && h.id !== b }, before)
  // Let the grow-in animation finish before axe looks at colours.
  await page.waitForTimeout(600)
}

const browser = await chromium.launch()
for (const scheme of ['light', 'dark']) {
  for (const w of [360, 768, 1280]) {
    const tag = `${scheme}-${w}`
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(e.message))

    // Fresh device: the Dashboard and the Log both start with "About my log".
    await page.goto(BASE + '#/log/dashboard')
    await page.waitForSelector('form.about-form')
    ok((await page.locator('.stat-grid, .empty-state').count()) === 0, `${tag} fresh Dashboard shows only "About my log"`)
    await page.goto(BASE + '#/log')
    await page.waitForSelector('form.about-form')
    ok((await page.getByRole('button', { name: 'Save entry' }).count()) === 0, `${tag} fresh Log has no entry form before a name`)
    const nameBox = page.getByLabel('My name')
    ok((await page.getByLabel('Start date (optional)').inputValue()) === today(), `${tag} start date defaults to today`)
    ok((await nameBox.getAttribute('aria-describedby'))?.split(' ').length === 1 &&
      (await page.locator(`#${(await nameBox.getAttribute('aria-describedby')).split(' ')[0]}`).innerText()) === 'Use your first name or a nickname. It stays on this device.', `${tag} name hint is linked to the field`)
    await page.screenshot({ path: `${SHOTS}${tag}-about-1-fresh.png`, fullPage: true })
    await axe(page, `${tag} fresh About card`)
    await checkLayout(page, `${tag} fresh About card`)

    await page.getByRole('button', { name: 'Start my log' }).click()
    ok(await focused(page, () => document.activeElement?.getAttribute('aria-invalid') === 'true'), `${tag} no name: focus moves to My name`)
    ok((await page.locator('.about-form .field-error').innerText()).includes('Enter your first name or a nickname.'), `${tag} no name: error shows`)
    await axe(page, `${tag} About card with error`)

    await nameBox.fill('Maya')
    await page.getByLabel(/^My plant/).fill('Basil')
    await page.getByRole('button', { name: 'Start my log' }).click()
    await page.waitForSelector('.learner-bar')
    ok(await said(page, 'Hi Maya! Your log is ready.'), `${tag} announces "Hi Maya! Your log is ready."`)
    ok(await focused(page, () => document.activeElement?.matches('.learner-bar > h2')), `${tag} focus moves to the log title`)
    ok((await page.locator('.learner-bar > h2').innerText()) === "Maya's Planting Log", `${tag} title "Maya's Planting Log"`)
    ok(/^Basil · started [A-Z][a-z]{2} \d+$/.test(await page.locator('.learner-details').innerText()), `${tag} details "${await page.locator('.learner-details').innerText()}"`)
    ok((await page.locator('.learner-notice').count()) === 0, `${tag} no "earlier entries" notice on a fresh device`)

    await addEntry(page, '3', { soil: true, water: true, date: '2026-10-20' })
    await addEntry(page, '4', { water: true, date: '2026-10-27' })
    await addEntry(page, '4.5', { date: '2026-10-27' })
    ok((await page.locator('.entry-fresh').first().getAttribute('class')).includes('entry'), `${tag} Maya has entries`)
    const learnerIds = await page.evaluate(() => new Promise((res) => {
      const q = indexedDB.open('bright-ideas')
      q.onsuccess = () => { const g = q.result.transaction('entries').objectStore('entries').getAll(); g.onsuccess = () => { res(g.result.map((e) => e.learnerId)); q.result.close() } }
    }))
    ok(learnerIds.length === 3 && learnerIds.every((id) => id === learnerIds[0] && typeof id === 'number'), `${tag} entries store a learner id (${learnerIds.join(',')})`)

    // Second learner on the same device.
    await page.getByRole('button', { name: "Who's logging?" }).click()
    ok((await page.getByRole('button', { name: "Who's logging?" }).getAttribute('aria-expanded')) === 'true', `${tag} switcher is expanded`)
    await page.getByRole('button', { name: '+ Add someone' }).click()
    await page.screenshot({ path: `${SHOTS}${tag}-about-2-add.png`, fullPage: true })
    await axe(page, `${tag} add someone`)
    await page.locator('.learner-panel').getByLabel('My name').fill('Sam')
    await page.locator('.learner-panel').getByRole('button', { name: 'Add to this device' }).click()
    ok(await said(page, 'Hi Sam! Your log is ready.'), `${tag} adding Sam switches to Sam`)
    ok((await page.locator('.learner-bar > h2').innerText()) === "Sam's Planting Log", `${tag} title is now Sam's`)
    ok(/^started [A-Z][a-z]{2} \d+$/.test(await page.locator('.learner-details').innerText()), `${tag} Sam left the plant blank: details show only the start date`)
    ok((await page.locator('.entry').count()) === 0, `${tag} Sam starts with no entries`)
    await addEntry(page, '2', { soil: true, date: '2026-10-28' })
    ok((await page.locator('.entry').count()) === 1, `${tag} Sam sees only Sam's entry`)

    // Switch back.
    await page.getByRole('button', { name: "Who's logging?" }).click()
    await page.screenshot({ path: `${SHOTS}${tag}-about-3-switcher.png`, fullPage: true })
    await axe(page, `${tag} switcher open`)
    await checkLayout(page, `${tag} switcher open`)
    ok((await page.locator('.learner-pick[aria-current]').innerText()).startsWith('Sam'), `${tag} switcher marks Sam as logging now`)
    await page.locator('.learner-pick', { hasText: 'Maya' }).click()
    ok(await said(page, "Switched to Maya's log"), `${tag} announces "Switched to Maya's log"`)
    ok(await focused(page, () => document.activeElement?.matches('.learner-bar > h2')), `${tag} focus on the title after switching`)
    ok((await page.locator('.timeline .entry').count()) === 3, `${tag} Maya sees her 3 entries`)

    // Dashboard: only Maya's entries, checklist counts by day.
    await page.goto(BASE + '#/log/dashboard')
    await page.waitForSelector('.checklist-counts')
    ok((await page.locator('.learner-bar > h2').innerText()) === "Maya's Planting Log", `${tag} Dashboard shows Maya's header`)
    const counts = await page.locator('.checklist-counts li').allInnerTexts()
    ok(counts.join(' | ') === 'Watered on 2 of 2 days | Soil checked on 1 of 2 days', `${tag} counts: ${counts.join(' | ')}`)
    ok((await page.locator('.stat', { hasText: 'Entries' }).locator('.stat-value').innerText()) === '3', `${tag} Dashboard entry count is Maya's (3)`)
    await page.screenshot({ path: `${SHOTS}${tag}-about-4-dashboard.png`, fullPage: true })
    await axe(page, `${tag} Dashboard two learners`)
    await checkLayout(page, `${tag} Dashboard`)

    // Rename Maya to Mia: everything follows.
    await page.getByRole('button', { name: /^Edit Maya's Planting Log/ }).click()
    ok(await focused(page, () => document.activeElement?.matches('.learner-bar h3')), `${tag} Edit moves focus to the form heading`)
    await axe(page, `${tag} edit details open`)
    await page.locator('.learner-bar').getByLabel('My name').fill('Mia')
    await page.locator('.learner-bar').getByRole('button', { name: 'Save changes' }).click()
    ok(await said(page, 'Changes saved'), `${tag} rename announces "Changes saved"`)
    ok(await focused(page, () => /^Edit/.test(document.activeElement?.textContent.trim() ?? '') && !!document.activeElement.closest('.learner-bar')), `${tag} focus back on Edit`)
    ok((await page.locator('.learner-bar > h2').innerText()) === "Mia's Planting Log", `${tag} renamed to Mia`)
    ok((await page.locator('.timeline .entry').count()) === 3, `${tag} Mia keeps the 3 entries`)

    // Delete Sam: only Sam's entry goes.
    await page.getByRole('button', { name: "Who's logging?" }).click()
    await page.locator('.learner-pick', { hasText: 'Sam' }).click()
    await page.getByRole('button', { name: /^Edit Sam's/ }).click()
    await page.getByRole('button', { name: "Delete Sam's log" }).click()
    const dialog = page.getByRole('dialog', { name: "Delete Sam's log?" })
    ok(await dialog.getByText(/their 1 entry and/).waitFor({ timeout: 3000 }).then(() => true, () => false), `${tag} delete dialog says how many entries`)
    ok(await focused(page, () => document.activeElement?.textContent === 'Cancel'), `${tag} dialog focuses Cancel first`)
    await dialog.getByRole('button', { name: 'Delete' }).click()
    ok(await said(page, "Sam's log was deleted"), `${tag} announces Sam's log was deleted`)
    ok((await page.locator('.learner-bar > h2').innerText()) === "Mia's Planting Log", `${tag} back to Mia after deleting Sam`)
    const left = await page.evaluate(() => new Promise((res) => {
      const q = indexedDB.open('bright-ideas')
      q.onsuccess = () => {
        const tx = q.result.transaction(['entries', 'learners'])
        const a = tx.objectStore('entries').count()
        const b = tx.objectStore('learners').count()
        tx.oncomplete = () => { res([a.result, b.result]); q.result.close() }
      }
    }))
    ok(left.join() === '3,1', `${tag} 3 entries and 1 learner left (${left.join(', ')})`)

    // Settings: remove my name and log.
    await page.goto(BASE + '#/settings')
    await page.getByRole('button', { name: 'Remove my name and log from this device' }).click()
    await axe(page, `${tag} Settings remove dialog`)
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    ok(await said(page, "Mia's log was deleted"), `${tag} Settings announces the removal`)
    ok(await focused(page, () => document.activeElement?.id === 'privacy-title'), `${tag} focus on the privacy heading`)
    ok((await page.getByRole('button', { name: 'Remove my name and log from this device' }).count()) === 0, `${tag} remove option gone with nobody left`)
    await checkLayout(page, `${tag} Settings`)
    await page.goto(BASE + '#/log')
    await page.waitForSelector('form.about-form')
    ok(true, `${tag} Log asks "About my log" again`)
    ok(errs.length === 0, `${tag} no page errors ${errs.join('; ')}`)
    await ctx.close()
  }
}

// Old entries on a device that had them before learners: they go to the first learner, said once.
const ctx = await browser.newContext({ viewport: { width: 360, height: 900 } })
const page = await ctx.newPage()
await page.goto(BASE + '#/log')
await page.waitForSelector('form.about-form')
await page.evaluate(() => new Promise((res) => {
  const q = indexedDB.open('bright-ideas')
  q.onsuccess = () => {
    const tx = q.result.transaction('entries', 'readwrite')
    tx.objectStore('entries').add({ plantId: 1, date: '2026-10-02', createdAt: 1, height: 2, heightUnit: 'cm', heightCm: 2, note: 'Old' })
    tx.oncomplete = () => { q.result.close(); res() }
  }
}))
await page.reload()
await startLog(page, 'Ana')
ok(await said(page, "Your earlier entries were added to Ana's log"), 'old entries: announced once')
ok((await page.locator('.learner-notice').innerText()) === "Your earlier entries were added to Ana's log", 'old entries: notice shows')
ok((await page.locator('.timeline .entry').count()) === 1, 'old entries: Ana sees the old entry')
await page.reload()
await page.waitForSelector('.learner-bar')
ok((await page.locator('.learner-notice').count()) === 0, 'old entries: notice does not come back')
await browser.close()
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
process.exitCode = fails ? 1 : 0
