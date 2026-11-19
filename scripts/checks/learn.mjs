// Checks Learn's "How to connect" section: where it sits on the page, the
// wire-color rule, the two circuit cards (closed at first, opened and closed
// by keyboard, one diagram each with a text alternative, numbered steps,
// success line, three tips ending with "Still stuck?"), old #/connect links
// landing on the section, the bottom nav, and axe in light and dark at 320
// and 1280 px.
// usage: see README, "Optional browser checks"
import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { APP_URL as BASE, AxeBuilder, chromium, SHOTS_DIR } from './deps.mjs'

let fails = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }

async function axe(page, label) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  ok(r.violations.length === 0, `axe ${label}: ${r.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target).join(', ')})`).join('; ') || '0 violations'}`)
}
async function noSideScroll(page, label) {
  const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  ok(sw <= w, `${label}: no sideways scrolling (${sw} ≤ ${w})`)
}
const isOpen = (card) => card.evaluate((d) => d.open)

mkdirSync(SHOTS_DIR, { recursive: true })
const browser = await chromium.launch()

/* ---------- The section and its cards, at 320 px in light mode ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 320, height: 800 } })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(BASE + '#/learn')
  await page.waitForSelector('#how-to-connect')

  const h2s = await page.locator('main h2').allInnerTexts()
  ok(h2s.join('|') === 'Parts in your kit|How to connect|Big ideas', `section order: ${h2s.join(', ')}`)
  const section = page.locator('.connect-section')
  ok((await section.locator('.callout').innerText()).includes('Red always means + (positive). Black always means − (negative).'), 'wire-color rule shown')
  const titles = (await section.locator('summary h3').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim())
  ok(titles.join('|') === 'Circuit 1: Panel + motor|Circuit 2: Full miniAgriPV system', `two circuits, numbered 1–2: ${titles.join(', ')}`)
  const tabs = await page.locator('.tabbar a').allInnerTexts()
  ok(tabs.join('|') === 'Home|Log|Learn|Simulation|Settings', `nav: ${tabs.join(', ')}`)

  const cards = section.locator('details.circuit-card')
  ok(await cards.count() === 2, 'two disclosure cards')
  ok(!(await isOpen(cards.nth(0))) && !(await isOpen(cards.nth(1))) && (await page.locator('.circuit-diagram').count()) === 0, 'both closed at first, no diagram drawn yet')
  await axe(page, '320 light, cards closed')

  // Open and close by keyboard.
  const first = cards.nth(0), summary = first.locator('summary')
  await summary.focus()
  await page.keyboard.press('Enter')
  ok(await isOpen(first), 'Enter opens a card')
  ok(await summary.evaluate((s) => s === document.activeElement), 'focus stays on the card title')
  ok(await first.locator('.circuit-diagram').count() === 1 && (await page.locator('.circuit-diagram').count()) === 1, 'an open card draws exactly one diagram')
  await page.keyboard.press('Space')
  ok(!(await isOpen(first)), 'Space closes it')
  await page.keyboard.press('Space')
  ok(await isOpen(first), 'Space opens it again')
  await page.keyboard.press('Tab')
  ok(await page.evaluate(() => document.activeElement?.tagName === 'SUMMARY' && document.activeElement.closest('details')?.id === 'circuit-full-system'), 'Tab moves on to the next card (nothing in a card traps focus)')

  // What each card holds.
  const expect = {
    motor: { title: 'Panel + motor', parts: 3, steps: 4, safety: 0, wires: ['a red (+) clip from the Solar panel red (+) wire to the Motor + fan + tab', 'a black (−) clip from the Motor + fan − tab to the Solar panel black (−) wire'] },
    'full-system': { title: 'Full miniAgriPV system', parts: 7, steps: 11, safety: 1, wires: ['a red (+) clip from the Solar panel red (+) wire to the Pump red (+) wire', 'a black (−) clip from the LED short leg (−) to the Motor + fan − tab'] },
  }
  for (const [id, want] of Object.entries(expect)) {
    const card = page.locator(`#circuit-${id}`)
    if (!(await isOpen(card))) await card.locator('summary').click()
    const svg = card.locator('svg.circuit-diagram')
    const name = await svg.evaluate((el) => {
      const ids = el.getAttribute('aria-labelledby').split(' ')
      return { role: el.getAttribute('role'), text: ids.map((i) => document.getElementById(i)?.textContent).join(' ') }
    })
    ok(name.role === 'img' && name.text.startsWith(`Finished circuit: ${want.title} Parts:`) && want.wires.every((w) => name.text.includes(w)), `${want.title}: diagram is an image whose text lists the parts and every wire`)
    ok(await svg.locator('.wire-pill-text').count() === (id === 'motor' ? 2 : 7), `${want.title}: every wire has a + or − tag (not color alone)`)
    ok(await card.locator('.circuit-parts li').count() === want.parts, `${want.title}: "You need" lists ${want.parts}`)
    ok(await card.locator('.circuit-steps > li').count() === want.steps, `${want.title}: ${want.steps} numbered steps`)
    ok(await card.locator('.circuit-step-safety').count() === want.safety, `${want.title}: ${want.safety} safety step`)
    ok((await card.locator('.callout-success').innerText()).startsWith('When it works:'), `${want.title}: success line`)
    const tips = await card.locator('.circuit-trouble li').allInnerTexts()
    ok(tips.length === 3 && tips[2].startsWith('Still stuck? Ask your facilitator'), `${want.title}: 3 tips, "Still stuck?" last`)
  }
  ok(await page.locator('.circuit-diagram').count() === 2, 'both open: one diagram per card')
  ok(await page.locator('.circuit-builder, .step-nav, .wire-halo, .wire-new').count() === 0, 'no step-by-step builder or wire highlighting')
  await axe(page, '320 light, cards open')
  await noSideScroll(page, '320 open')
  await page.locator('.connect-section').screenshot({ path: path.join(SHOTS_DIR, 'learn-connect-320.png') })

  // Old Connect links land on the section, with focus on its heading.
  for (const old of ['#/connect', '#/connect/motor', '#/connect/full-system']) {
    await page.goto(BASE + '#/')
    await page.waitForSelector('.home-links')
    await page.goto(BASE + old)
    await page.waitForFunction(() => document.activeElement?.id === 'how-to-connect', null, { timeout: 5000 }).catch(() => {})
    const at = await page.evaluate(() => ({ hash: location.hash, focus: document.activeElement?.id, top: document.getElementById('how-to-connect')?.getBoundingClientRect().top }))
    ok(at.hash === '#/learn#how-to-connect' && at.focus === 'how-to-connect' && at.top >= -1 && at.top < 200, `${old} → #/learn#how-to-connect, scrolled to the section, focus on its heading`)
  }
  // Leaving the section still resets to the top of the next page.
  await page.locator('.tabbar').getByRole('link', { name: 'Home' }).click()
  await page.waitForFunction(() => document.activeElement?.tagName === 'H1')
  ok(await page.evaluate(() => window.scrollY) === 0, 'after the section, the next page starts at the top with focus on its heading')

  ok(errs.length === 0, `no page errors ${errs.join('; ')}`)
  await ctx.close()
}

/* ---------- axe in light and dark at 320 and 1280 px ---------- */
for (const width of [320, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    const tag = `${width} ${colorScheme}`
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme })
    const page = await ctx.newPage()
    await page.goto(BASE + '#/connect')
    await page.waitForSelector('#how-to-connect')
    if (!(width === 320 && colorScheme === 'light')) await axe(page, `${tag}, cards closed`)
    for (const s of await page.locator('.circuit-card summary').all()) await s.click()
    await page.waitForFunction(() => document.querySelectorAll('.circuit-diagram').length === 2)
    if (!(width === 320 && colorScheme === 'light')) await axe(page, `${tag}, cards open`)
    await noSideScroll(page, tag)
    await page.locator('.connect-section').screenshot({ path: path.join(SHOTS_DIR, `learn-connect-${width}-${colorScheme}.png`) })
    await ctx.close()
  }
}

await browser.close()
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
process.exitCode = fails ? 1 : 0
