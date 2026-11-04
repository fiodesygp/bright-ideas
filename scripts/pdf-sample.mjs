// Makes a sample Dashboard PDF for accessibility checks (veraPDF in CI, or PAC by hand).
// It adds four log entries through the app's own UI, including notes with emoji
// and non-Latin text, then clicks "Save as PDF".
//
// usage: node scripts/pdf-sample.mjs <app-url> <out.pdf>
//   e.g. node scripts/pdf-sample.mjs http://localhost:4173/bright-ideas/ sample.pdf
// Needs Playwright: npm i --no-save playwright && npx playwright install chromium
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const [appUrl, out] = process.argv.slice(2)
if (!appUrl || !out) {
  console.error('usage: node scripts/pdf-sample.mjs <app-url> <out.pdf>')
  process.exit(2)
}
const photo = fileURLToPath(new URL('../public/icon-512.png', import.meta.url))
// Read the "saved" message from the app's content, so rewording it doesn't break this script.
const savedMessage = JSON.parse(readFileSync(new URL('../src/content/log.json', import.meta.url), 'utf8')).announce.saved
const entries = [
  ['2026-10-07', '2.5', 'Two tiny leaves today.', true],
  ['2026-10-14', '4', 'Grew fast 🌱! My abuela said 很好. Soil stays damp.', true],
  ['2026-10-21', '5.5', '🌵🌵', false],
  ['2026-10-27', '7.5', 'The leaves look bigger on the shady side.', true],
]

const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 375, height: 812 }, acceptDownloads: true })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

await page.goto(new URL('#/log', appUrl).href)
for (const [date, height, note, withPhoto] of entries) {
  await page.fill('input[type=date]', date)
  await page.fill('input[inputmode=decimal]', height)
  await page.fill('textarea', note)
  if (withPhoto) {
    await page.setInputFiles('input[type=file]', photo)
    await page.locator('.photo-preview img').waitFor()
  }
  await page.click('button[type=submit]')
  await page.locator('.saved-callout').getByText(savedMessage).waitFor()
}
await page.goto(new URL('#/log/dashboard', appUrl).href)
const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30_000 }), page.getByRole('button', { name: 'Save as PDF' }).click()])
await download.saveAs(out)
await browser.close()

if (errors.length) {
  console.error('Console errors while exporting:\n' + errors.join('\n'))
  process.exit(1)
}
console.log(`Saved ${out}`)
