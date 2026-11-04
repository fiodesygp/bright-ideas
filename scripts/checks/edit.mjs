// Checks editing an entry on the Dashboard: the edit form keeps the photo-first
// order without the "No photo today" link, keeps and changes checklist ticks, Remove moves focus to "Add a photo",
// saving announces "Changes saved" and returns focus to the card's Edit button,
// and axe finds no problems.
//
// usage: see README, "Optional browser checks"
import { APP_URL as BASE, AxeBuilder, chromium, makePhoto, startLog } from './deps.mjs'

let fails = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }

const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 360, height: 900 } })).newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message))

// Add one entry with a photo, then edit it on the Dashboard.
await page.goto(BASE + '#/log')
await startLog(page)
await page.waitForSelector('.log-form')
await page.locator('.photo-drop input[type=file]').setInputFiles(await makePhoto(page))
await page.waitForSelector('.photo-preview img')
await page.getByLabel(/Plant height/).fill('3')
await page.getByRole('checkbox', { name: /^Water/ }).check()
await page.getByRole('button', { name: 'Save entry' }).click()
await page.waitForSelector('.entry')
await page.goto(BASE + '#/log/dashboard')
await page.locator('.entry').getByRole('button', { name: /^Edit/ }).first().click()

const form = page.locator('.entry .log-form')
await form.locator('.photo-preview img').waitFor()
ok(true, 'edit form shows the saved photo')
const order = (await form.locator('.field-label').allInnerTexts()).map((t) => t.split(' ')[0]).join(' > ')
ok(order === 'Photo > Date > Plant > Checklist > What', `edit form order ${order}`)
ok(await form.getByRole('checkbox', { name: /^Water/ }).isChecked(), 'edit form keeps the Water tick')
ok(!(await form.getByRole('checkbox', { name: /^Soil/ }).isChecked()), 'edit form keeps Soil unticked')
await form.getByRole('checkbox', { name: /^Soil/ }).check()
ok((await form.getByText('No photo today').count()) === 0, 'edit form has no "No photo today" link')

await form.getByRole('button', { name: 'Remove photo' }).click()
await page.waitForFunction(() => !!document.activeElement?.closest('.entry .photo-drop'), null, { timeout: 3000 }).catch(() => {})
ok(await page.evaluate(() => !!document.activeElement?.closest('.entry .photo-drop')), 'Remove moves focus to "Add a photo"')

await form.getByRole('button', { name: 'Save changes' }).click()
const said = await page.waitForFunction(() => document.getElementById('announcer')?.textContent === 'Changes saved', null, { timeout: 3000 }).then(() => true, () => false)
ok(said, 'saving announces "Changes saved"')
const onEdit = () => /^Edit/.test(document.activeElement?.textContent.trim() ?? '') && !!document.activeElement.closest('.entry')
await page.waitForFunction(onEdit, null, { timeout: 3000 }).catch(() => {})
ok(await page.evaluate(onEdit), 'focus returns to the card\'s Edit button')
ok((await page.locator('.entry img').count()) === 0, 'photo is gone after saving')
const chips = await page.locator('.entry .entry-tick').allTextContents()
ok(chips.join(',') === 'Soil ✓ ticked,Water ✓ ticked', `card shows both ticks after the edit (${chips.join(', ')})`)

const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
ok(r.violations.length === 0, `axe after editing: ${r.violations.map((v) => v.id).join(', ') || '0 violations'}`)
ok(errs.length === 0, `no page errors ${errs.join('; ')}`)

await browser.close()
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
process.exitCode = fails ? 1 : 0
