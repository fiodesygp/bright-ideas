// Checks the Planting Log form at 360/768/1280 px in light and dark mode, with
// and without a photo, with old entries already saved: field order, the
// announcements, focus, axe, 44px targets, sideways scrolling and reduced motion.
// It saves screenshots to SHOTS_DIR (outside the repo by default) for a look.
//
// usage: see README, "Optional browser checks"
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { APP_URL as BASE, AxeBuilder, SHOTS_DIR, chromium, makePhoto } from './deps.mjs'

const SHOTS = SHOTS_DIR + path.sep
mkdirSync(SHOTS, { recursive: true })

let fails = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }

// Old entries: one with fields the 4-field log no longer uses plus a photo, one with no note at all.
async function seedOld(page) {
  await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 300
    const g = c.getContext('2d'); g.fillStyle = '#7a5'; g.fillRect(0, 0, 400, 300); g.fillStyle = '#353'; g.fillRect(180, 60, 40, 240)
    const photo = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8))
    const db = await new Promise((res, rej) => { const q = indexedDB.open('bright-ideas'); q.onsuccess = () => res(q.result); q.onerror = rej })
    const tx = db.transaction('entries', 'readwrite')
    const s = tx.objectStore('entries')
    s.add({ plantId: 1, date: '2026-10-01', createdAt: 1, height: 3.5, heightUnit: 'cm', heightCm: 3.5, note: 'First sprout! Old entry with extra fields.', leafCount: 2, sunlight: 'partly sunny', watered: true, photo })
    s.add({ plantId: 1, date: '2026-10-08', createdAt: 2, height: 2, heightUnit: 'in', heightCm: 5.08 })
    await new Promise((r) => (tx.oncomplete = r))
    db.close()
  })
}

const waitLive = async (page, text) => {
  try { await page.waitForFunction((t) => document.getElementById('announcer')?.textContent === t, text, { timeout: 3000 }); return true } catch { return false }
}

async function axe(page, label) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  ok(r.violations.length === 0, `axe ${label}: ${r.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target).join(', ')})`).join('; ') || '0 violations'}`)
  const cc = r.incomplete.filter((i) => i.id === 'color-contrast')
  if (cc.length) console.log(`  note: axe could not judge contrast for ${cc[0].nodes.map((n) => n.target).join(', ')}`)
}

async function checkLayout(page, label) {
  const { sw, cw, small } = await page.evaluate(() => {
    const els = [...document.querySelectorAll('main a, main button, main input:not(.visually-hidden), main textarea, main label.btn, main .photo-drop')]
    const small = els.filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.height < 44 || r.width < 44) }).map((e) => `${e.tagName}.${e.className} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`)
    return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, small }
  })
  ok(sw <= cw, `${label} no horizontal scroll (${sw}/${cw})`)
  ok(small.length === 0, `${label} targets ≥44px ${small.join(', ')}`)
}

const browser = await chromium.launch()
for (const scheme of ['light', 'dark']) {
  for (const w of [360, 768, 1280]) {
    const tag = `${scheme}-${w}`
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(e.message))
    await page.goto(BASE + '#/log')
    await page.waitForSelector('.log-form')
    await seedOld(page)
    await page.reload()
    await page.waitForSelector('.entry')
    const PHOTO = await makePhoto(page)

    // Field order: photo first, then date, height, notes, save.
    const order = await page.$$eval('.log-form .field-label, .log-form button[type=submit]', (els) => els.map((e) => e.textContent.trim().split(' ')[0]))
    ok(order.join(',') === 'Photo,Date,Plant,What,Save', `${tag} order ${order.join(' > ')}`)
    ok((await page.locator('.entry').count()) === 2, `${tag} old entries show (2 cards)`)
    ok((await page.locator('.entry').first().innerText()).includes('5.1 cm') && !(await page.locator('.entry').first().locator('.entry-note').count()), `${tag} old entry with no note shows its height (2 in saved, 5.1 cm shown)`)
    await page.screenshot({ path: `${SHOTS}${tag}-1-empty.png`, fullPage: true })
    await axe(page, `${tag} empty form + old entries`)
    await checkLayout(page, `${tag} empty`)

    // "No photo today" moves focus to Date.
    await page.getByRole('button', { name: 'No photo today' }).click()
    ok(await page.evaluate(() => document.activeElement?.type === 'date'), `${tag} "No photo today" focuses Date`)

    // Add a photo with the keyboard-focusable input.
    await page.locator('.photo-drop input[type=file]').setInputFiles(PHOTO)
    await page.waitForSelector('.photo-preview img')
    ok(await waitLive(page, 'Photo added'), `${tag} announces "Photo added"`)
    ok(await page.evaluate(() => document.activeElement?.closest('label')?.textContent.includes('Change')), `${tag} focus moves to Change`)
    const pw = await page.locator('.photo-preview img').evaluate((i) => i.getBoundingClientRect().width)
    ok(pw > Math.min(w, 720) * 0.6, `${tag} preview is big (${Math.round(pw)}px wide)`)
    await page.screenshot({ path: `${SHOTS}${tag}-2-photo.png`, fullPage: true })
    await axe(page, `${tag} with photo`)
    await checkLayout(page, `${tag} with photo`)

    await page.getByRole('button', { name: 'Remove photo' }).click()
    ok(await waitLive(page, 'Photo removed'), `${tag} announces "Photo removed"`)
    ok(await page.evaluate(() => !!document.activeElement?.closest('.photo-drop')), `${tag} focus returns to Add a photo`)

    // Change photo via the Change input, then save.
    await page.locator('.photo-drop input[type=file]').setInputFiles(PHOTO)
    await page.waitForSelector('.photo-preview img')
    await page.locator('.photo-preview input[type=file]').setInputFiles(PHOTO)
    await page.getByLabel(/Plant height/).fill('6.5')
    const ph = await page.getByLabel(/What happened/).getAttribute('placeholder')
    ok(ph === 'I noticed…', `${tag} story placeholder "${ph}"`)
    await page.getByLabel(/What happened/).fill('I noticed two new leaves. Next I want to try more sun.')
    await page.getByRole('button', { name: 'Save entry' }).click()
    ok(await waitLive(page, 'Saved to your Planting Log!'), `${tag} announces "Saved to your Planting Log!"`)
    await page.waitForSelector('.entry-fresh')
    ok(await page.locator('.entry-fresh').getByText('Just saved').isVisible(), `${tag} new card shows "Just saved"`)
    ok((await page.locator('.entry-fresh img').count()) === 1, `${tag} new card has its photo`)
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${SHOTS}${tag}-3-saved.png`, fullPage: true })
    await axe(page, `${tag} after save`)
    await checkLayout(page, `${tag} after save`)

    // Dashboard list with larger photos and old entries.
    await page.goto(BASE + '#/log/dashboard')
    await page.waitForSelector('.entry')
    ok((await page.locator('.entry').count()) === 3, `${tag} dashboard lists 3 entries`)
    await page.screenshot({ path: `${SHOTS}${tag}-4-dashboard.png`, fullPage: true })
    await axe(page, `${tag} dashboard`)
    ok(errs.length === 0, `${tag} no page errors ${errs.join('; ')}`)
    await ctx.close()
  }
}

// Reduced motion: message and badge still show, no animation runs.
const ctx = await browser.newContext({ viewport: { width: 360, height: 900 }, reducedMotion: 'reduce' })
const page = await ctx.newPage()
await page.goto(BASE + '#/log')
await page.getByLabel(/Plant height/).fill('4')
await page.getByRole('button', { name: 'Save entry' }).click()
await page.waitForSelector('.entry-fresh')
const dur = await page.evaluate(() => [getComputedStyle(document.querySelector('.entry-fresh')).animationDuration, getComputedStyle(document.querySelector('.saved-callout')).animationDuration])
ok(dur.every((d) => parseFloat(d) < 0.001), `reduced motion: animations off (${dur.join(', ')})`)
ok(await page.getByText('Saved to your Planting Log!').first().isVisible(), 'reduced motion: saved message still shows')
const ctx2 = await browser.newContext({ viewport: { width: 360, height: 900 } })
const p2 = await ctx2.newPage()
await p2.goto(BASE + '#/log')
await p2.getByLabel(/Plant height/).fill('4')
await p2.getByRole('button', { name: 'Save entry' }).click()
await p2.waitForSelector('.entry-fresh')
const dur2 = await p2.evaluate(() => getComputedStyle(document.querySelector('.entry-fresh')).animationDuration)
ok(parseFloat(dur2) > 0.3, `normal motion: card grows in (${dur2})`)

// Keyboard only: Tab from the top reaches the photo input first in the form.
await p2.reload()
await p2.locator('.log-form h2').evaluate((h) => { h.tabIndex = -1; h.focus() })
await p2.keyboard.press('Tab')
ok(await p2.evaluate(() => document.activeElement?.type === 'file'), 'keyboard: first stop in the form is Add a photo')
await p2.keyboard.press('Tab')
ok(await p2.evaluate(() => document.activeElement?.textContent.includes('No photo today')), 'keyboard: next is No photo today')
await p2.keyboard.press('Enter')
ok(await p2.evaluate(() => document.activeElement?.type === 'date'), 'keyboard: Enter on it moves to Date')
await browser.close()
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
process.exitCode = fails ? 1 : 0
