// Checks the Simulation page end to end: the bottom nav and old links
// (#/sun-day, #/connect), playing with no name (nothing saved or uploaded),
// then with a name: choosing a design, predicting, running the day
// (animation, Skip, focus and announcements), the Sun Score and hints, a
// challenge with locked choices, reduced motion, "My simulation runs"
// (newest first, per learner), the upload to the local test server, and axe
// in light and dark at 320 and 1280 px.
//
// Like sync.mjs, it needs a build that posts to the local endpoint, served on port 5173:
//   VITE_SYNC_URL=http://localhost:5180/api/sync npm run build
//   npx vite preview --port 5173 --strictPort
// usage: see README, "Optional browser checks"
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { APP_URL as BASE, AxeBuilder, chromium, SHOTS_DIR, startLog } from './deps.mjs'
import { startServers, store } from './sync-server.mjs'

let fails = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
async function until(fn, ms = 15_000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (fn()) return true
    await new Promise((r) => setTimeout(r, 100))
  }
  return false
}
const said = (page, text, timeout = 6000) =>
  page.waitForFunction((t) => document.getElementById('announcer')?.textContent === t, text, { timeout }).then(() => true, () => false)
const focusedText = (page) => page.evaluate(() => document.activeElement?.textContent?.trim())
const runs = (deviceId) => [...store.sun_day_runs.values()].filter((r) => r.device_id === deviceId)

async function axe(page, label) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  ok(r.violations.length === 0, `axe ${label}: ${r.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target).join(', ')})`).join('; ') || '0 violations'}`)
}
async function noSideScroll(page, label) {
  const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  ok(sw <= w, `${label}: no sideways scrolling (${sw} ≤ ${w})`)
}
const localRuns = (page) => page.evaluate(() => new Promise((res) => {
  const q = indexedDB.open('bright-ideas')
  q.onsuccess = () => { const c = q.result.transaction('sunDayRuns').objectStore('sunDayRuns').count(); c.onsuccess = () => { res(c.result); q.result.close() } }
}))

mkdirSync(SHOTS_DIR, { recursive: true })
process.env.SYNC_RATE_LIMIT_PER_MINUTE = '10000'
const stop = await startServers()
const browser = await chromium.launch()

/* ---------- The whole flow, at 320 px in light mode ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 320, height: 800 } })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))

  const requests = []
  page.on('request', (r) => r.url().includes('/api/sync') && requests.push(r.url()))

  // Home has a Simulation card; the bottom nav has five tabs, with Simulation in Connect's old place.
  await page.goto(BASE)
  const card = page.locator('.home-links').getByRole('link', { name: /Simulation/ })
  ok(await card.count() === 1, 'Home: Simulation card')
  ok(await page.getByRole('link', { name: /Connect/ }).count() === 0, 'Home: no Connect links')
  const tabs = await page.locator('.tabbar a').allInnerTexts()
  ok(tabs.join('|') === 'Home|Log|Learn|Simulation|Settings', `nav: ${tabs.join(', ')}`)
  const fit = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('.tabbar a span')].map((s) => ({ s, r: s.getBoundingClientRect() }))
    return {
      oneLine: spans.every(({ s, r }) => r.height < 24 && s.scrollWidth <= s.parentElement.clientWidth),
      gap: Math.min(...spans.slice(1).map(({ r }, i) => r.left - spans[i].r.right)),
      inside: spans.at(-1).r.right <= window.innerWidth - 4,
    }
  })
  ok(fit.oneLine && fit.gap >= 8 && fit.inside, `nav at 320 px: every label on one line, at least 8 px apart (${Math.round(fit.gap)} px), inside the screen`)
  await card.click()
  await page.waitForURL(/#\/simulation$/)
  ok(await page.evaluate(() => document.activeElement?.tagName) === 'H1' && (await focusedText(page)) === 'Simulation', 'Home card opens Simulation with focus on its heading')
  ok(await page.locator('.tabbar a[aria-current="page"]').innerText() === 'Simulation', 'nav: Simulation tab is current')

  // Old links land on Simulation.
  for (const old of ['#/sun-day', '#/connect', '#/connect/full-system']) {
    await page.goto(BASE + old)
    await page.waitForSelector('.sd-scene')
    ok(new URL(page.url()).hash === '#/simulation', `${old} redirects to #/simulation`)
  }

  // No name yet: play straight away, nothing is saved or uploaded.
  ok(await page.locator('form.about-form').count() === 0, 'no name: no "About my log" step first')
  ok(await page.getByText('The numbers are estimates for learning, not measurements.').isVisible(), 'estimates note shown')
  ok(await page.getByText('Runs are saved for').count() === 0, 'no name: no "Runs are saved for" line')
  const runsHint = page.locator('.sd-runs .sd-save-hint')
  ok((await runsHint.innerText()).includes('Add your name on the Planting Log to save your runs.') && await runsHint.getByRole('link', { name: 'Go to the Planting Log' }).count() === 1, 'no name: My simulation runs shows the hint with a link')
  await axe(page, '320 light, no name')
  await page.getByRole('radio', { name: 'More', exact: true }).check()
  await page.getByRole('button', { name: 'Run the day', exact: true }).last().click()
  await page.getByRole('button', { name: 'Skip to results' }).click()
  await page.waitForSelector('.sd-results')
  const total0 = Number(await page.locator('.sd-total b').innerText())
  ok(await said(page, `Results are ready. Sun Score: ${total0} out of 200. Add your name on the Planting Log to save your runs.`), 'no name: results announced with the save hint')
  const resultsHint = page.locator('.sd-results .sd-save-hint')
  ok(await resultsHint.isVisible() && await resultsHint.getByRole('link', { name: 'Go to the Planting Log' }).count() === 1, 'no name: results show the hint with a link')
  ok((await page.locator('.sd-feedback').innerText()).includes('You guessed more.'), 'no name: the run itself works (prediction compared)')
  ok(await page.locator('.sd-run').count() === 0 && (await localRuns(page)) === 0, 'no name: nothing saved on the device')
  await page.waitForTimeout(2500)
  ok(store.sun_day_runs.size === 0 && requests.length === 0, `no name: nothing uploaded (${requests.length} requests)`)
  await axe(page, '320 light, no name, results')

  // Add a name on the Planting Log, through the hint's link, then come back.
  await resultsHint.getByRole('link', { name: 'Go to the Planting Log' }).click()
  await page.waitForURL(/#\/log$/)
  await startLog(page, 'Maya')
  await page.goto(BASE + '#/simulation')
  await page.waitForSelector('.sd-scene')
  ok(await page.getByText('Runs are saved for Maya.').isVisible(), 'with a name: "Runs are saved for Maya."')
  ok(await page.getByText('No runs yet.', { exact: false }).isVisible() && await page.locator('.sd-save-hint').count() === 0, 'with a name: My simulation runs empty, no hint (the no-name run was not kept)')
  const deviceId = await page.evaluate(() => localStorage.getItem('bright-ideas:deviceId'))
  await axe(page, '320 light, ready')
  await noSideScroll(page, '320 ready')
  ok(await page.getByText('These show your setup at sunrise.', { exact: false }).isVisible(), 'gauges show sunrise before a run')

  // Design, by keyboard and pointer.
  const heat = page.getByRole('radio', { name: 'Heat wave, 110 °F' })
  await heat.focus()
  await page.keyboard.press('Space')
  ok(await heat.isChecked(), 'keyboard: Space picks a radio chip')
  await page.getByRole('radio', { name: 'Both', exact: true }).check()
  await page.getByRole('radio', { name: 'High', exact: true }).check()
  await page.getByRole('checkbox', { name: /^Pump/ }).check()
  ok(await page.getByText('The pump waters the plant by itself', { exact: false }).isVisible(), 'pump on: the help text changes')
  await page.getByRole('radio', { name: 'More', exact: true }).check()
  await page.getByRole('radio', { name: 'the shade keeps it cool' }).check()
  ok(await page.getByRole('group', { name: 'Your reason: …because' }).count() === 1, 'reason group has a full name')
  const targets = await page.locator('.sd-controls .chip, .sd-controls .btn, .sd-playbar .btn').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height < 44).length)
  ok(targets === 0, `targets at least 44 px tall (${targets} smaller)`)
  await page.screenshot({ path: path.join(SHOTS_DIR, 'sunday-320-design.png'), fullPage: true })

  // Run the day from step 4 with the keyboard.
  const run = page.getByRole('button', { name: 'Run the day', exact: true }).last()
  await run.focus()
  await page.keyboard.press('Enter')
  ok(await said(page, 'The day is running.', 2000), 'run: "The day is running." announced')
  await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Skip to results', null, { timeout: 2000 }).catch(() => {})
  ok((await focusedText(page)) === 'Skip to results', 'run: focus moves to Skip (the Run buttons are disabled)')
  ok(await page.getByRole('button', { name: 'Run the day', exact: true }).first().isDisabled(), 'run: Run is disabled while the day plays')
  await page.waitForTimeout(1600)
  const clock = await page.locator('.sd-clock').innerText()
  ok(clock !== '6:00 · Day 1' && /^\d+:00 · Day 1$/.test(clock), `run: the clock moves (${clock})`)
  ok(await page.locator('.sd-running').isVisible(), 'run: "What is running now" shows')
  await page.screenshot({ path: path.join(SHOTS_DIR, 'sunday-320-playing.png') })
  await page.keyboard.press('Enter') // Skip
  await page.waitForSelector('.sd-results')
  ok((await focusedText(page)) === 'Your Sun Score', 'done: focus on the "Your Sun Score" heading')
  const total = Number(await page.locator('.sd-total b').innerText())
  ok(total >= 0 && total <= 200, `done: Sun Score ${total} out of 200`)
  ok(await said(page, `Results are ready. Sun Score: ${total} out of 200. Saved to My simulation runs.`), 'done: score and "Saved" announced')
  ok(await page.locator('.sd-save-hint').count() === 0, 'with a name: no save hint')
  ok((await page.locator('.sd-feedback').innerText()).includes('You guessed more because the shade keeps it cool.'), 'results: the prediction is compared with what happened')
  ok((await page.locator('.sd-feedback dt').allInnerTexts()).join('|') === 'Your prediction|What happened|Why|Try next', 'results: prediction, what happened, why, try next')
  ok(await page.getByRole('button', { name: 'Run it again', exact: true }).count() === 2, 'done: Run buttons now say "Run it again"')

  // Hints, one at a time.
  const hint = page.locator('.sd-results .btn')
  for (let i = 0; i < 3; i++) await hint.click()
  ok((await page.locator('.sd-ladder p').count()) === 3 && (await hint.isDisabled()) && (await hint.innerText()) === 'That is all the help', 'hints: three steps, then the button stops')
  ok((await page.locator('.sd-ladder strong').allInnerTexts()).join('|') === 'Question:|Hint:|Example:', 'hints: Question, Hint, Example')

  // My simulation runs and the upload.
  await page.waitForSelector('.sd-run')
  const first = page.locator('.sd-run').first()
  ok((await first.locator('h3').innerText()).startsWith(`Sun Score ${total}`), 'My simulation runs: the run shows with its score')
  ok((await first.innerText()).includes('Basil, both panels, set high, fan and pump') && (await first.innerText()).includes('Heat wave, 110 °F, 1 day'), 'My simulation runs: design summary')
  ok(/Guessed more because the shade keeps it cool\. It grew (more|about the same|less)\./.test(await first.innerText()), 'My simulation runs: prediction vs result')
  ok(await until(() => runs(deviceId).length === 1), 'upload: the run reached the test server')
  const up = runs(deviceId)[0]
  ok(up?.score === total && up.crop === 'basil' && up.weather === 'july' && up.panels === 'both' && up.height === 'high' && up.fan === true && up.pump === true
    && up.guess === 'more' && up.why === 'shade' && up.challenge === null && up.learner_local_id === 1, 'upload: run fields match what the learner saw')
  ok(store.learners.get(`${deviceId}/1`)?.name === 'Maya', 'upload: the learner is uploaded too')
  await axe(page, '320 light, results')
  await noSideScroll(page, '320 results')
  await page.screenshot({ path: path.join(SHOTS_DIR, 'sunday-320-results.png'), fullPage: true })

  // A challenge locks its choices and turns on what it needs. With reduced motion there is no animation.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByLabel('Play mode').selectOption({ label: 'Challenge 2: Fan all afternoon' })
  ok(await page.getByText('Keep the fan spinning every hour from noon to 5 pm', { exact: false }).isVisible(), 'challenge: the goal shows')
  ok(await page.getByRole('radio', { name: 'Heat wave, 110 °F' }).isDisabled() && await page.getByRole('radio', { name: 'Sunny day, 90 °F' }).isChecked(), 'challenge: weather locked to a sunny day')
  const fan = page.getByRole('checkbox', { name: /^Fan/ })
  ok(await fan.isChecked() && await fan.isDisabled(), 'challenge: fan turned on and locked')
  ok(await page.locator('.sd-results').count() === 0, 'a change clears the old results')
  const t0 = Date.now()
  await page.getByRole('button', { name: 'Skip prediction and run the day' }).click()
  await page.waitForSelector('.sd-results')
  ok(Date.now() - t0 < 1500 && (await page.getByRole('button', { name: 'Skip to results' }).count()) === 0, `reduced motion: straight to the results, no animation (${Date.now() - t0} ms)`)
  ok(/Challenge passed|Not yet/.test(await page.locator('.sd-total').innerText()), 'challenge: passed or "Not yet" badge')
  ok((await page.locator('.sd-feedback').innerText()).includes('You skipped the prediction this time.'), 'skip: results say the prediction was skipped')
  await page.waitForFunction(() => document.querySelectorAll('.sd-run').length === 2)
  const newest = await page.locator('.sd-run').first().innerText()
  ok(newest.includes('Challenge 2: Fan all afternoon') && newest.includes('No guess.'), 'My simulation runs: newest first, with the challenge')
  ok(await until(() => runs(deviceId).length === 2 && runs(deviceId).some((r) => r.challenge === 'fan' && r.guess === null)), 'upload: second run reached the test server')
  await axe(page, '320 light, challenge results')

  // The design is remembered on this device.
  await page.reload()
  await page.waitForSelector('.sd-scene')
  ok(await page.getByRole('radio', { name: 'Both', exact: true }).isChecked() && await page.getByRole('checkbox', { name: /^Pump/ }).isChecked(), 'reload: last design remembered')

  // Runs belong to the learner logging now.
  await page.goto(BASE + '#/log')
  await page.getByRole('button', { name: "Who's logging?" }).click()
  await page.getByRole('button', { name: '+ Add someone' }).click()
  await page.locator('.learner-panel').getByLabel('My name').fill('Sam')
  await page.locator('.learner-panel').getByRole('button', { name: 'Add to this device' }).click()
  await page.waitForFunction(() => document.querySelector('.learner-bar > h2')?.textContent === "Sam's Planting Log")
  await page.goto(BASE + '#/simulation')
  await page.waitForSelector('.sd-runs')
  ok(await page.getByText('Runs are saved for Sam.').isVisible() && (await page.locator('.sd-run').count()) === 0, "another learner: Sam sees only Sam's runs (none)")

  ok(errs.length === 0, `no page errors ${errs.join('; ')}`)
  ok(store.unknown.length === 0, `fake Supabase saw only expected calls ${store.unknown.join(', ')}`)
  await ctx.close()
}

/* ---------- axe in light and dark at 320 and 1280 px ---------- */
for (const width of [320, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    if (width === 320 && colorScheme === 'light') continue // done above
    const tag = `${width} ${colorScheme}`
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme })
    const page = await ctx.newPage()
    await page.goto(BASE + '#/simulation')
    await page.waitForSelector('.sd-scene')
    await axe(page, `${tag}, no name`)
    await noSideScroll(page, tag)
    await page.getByRole('radio', { name: 'Less', exact: true }).check()
    await page.getByRole('button', { name: 'Run the day', exact: true }).first().click()
    await page.waitForSelector('.sd-running')
    await axe(page, `${tag}, playing`)
    await page.getByRole('button', { name: 'Skip to results' }).click()
    await page.waitForSelector('.sd-results')
    await page.locator('.sd-results .btn').click()
    await axe(page, `${tag}, results (no name: hint shown)`)
    await noSideScroll(page, `${tag} results`)
    await page.screenshot({ path: path.join(SHOTS_DIR, `sunday-${width}-${colorScheme}.png`), fullPage: true })
    await ctx.close()
  }
}

await browser.close()
await stop()
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
process.exitCode = fails ? 1 : 0
