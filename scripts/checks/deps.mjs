// Playwright and axe are not project dependencies. Run the checks through
// `npx -p playwright@… -p @axe-core/playwright@… node …` (see README): npx
// installs them in a temporary folder and puts its node_modules/.bin on PATH.
// Node's `import` doesn't look there, so load them from that folder by hand.
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'

function load(name) {
  const dirs = (process.env.PATH ?? '').split(path.delimiter).filter((d) => d.endsWith(path.join('node_modules', '.bin')))
  for (const dir of dirs) {
    try {
      return createRequire(path.join(dir, '..', 'package.json'))(name)
    } catch {
      // Not in this folder; try the next one.
    }
  }
  console.error(`Could not find ${name}. Run this script through npx as shown in the README ("Optional browser checks").`)
  process.exit(2)
}

export const { chromium } = load('playwright')
export const AxeBuilder = load('@axe-core/playwright').default

export const APP_URL = process.argv[2] ?? 'http://localhost:5173/bright-ideas/'
/** Screenshots go outside the repo unless SHOTS_DIR says otherwise. */
export const SHOTS_DIR = process.env.SHOTS_DIR ?? path.join(tmpdir(), 'bright-ideas-checks')

/** A plant-like JPEG drawn in the page, so the checks need no image files. */
export async function makePhoto(page) {
  const b64 = await page.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = 1600
    c.height = 1200
    const g = c.getContext('2d')
    g.fillStyle = '#78aa5a'
    g.fillRect(0, 0, 1600, 1200)
    g.fillStyle = '#3c823c'
    g.beginPath()
    g.arc(800, 600, 300, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#5a3c1e'
    g.fillRect(780, 700, 40, 450)
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85))
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let s = ''
    for (const b of bytes) s += String.fromCharCode(b)
    return btoa(s)
  })
  return { name: 'plant.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(b64, 'base64') }
}

/** Fills in the "About my log" card when it shows (a fresh device), so the Log form appears. */
export async function startLog(page, name = 'Maya', plant = 'Basil') {
  await page.locator('.learner-bar, form.about-form').first().waitFor()
  if (!(await page.locator('form.about-form').count())) return
  await page.getByLabel('My name').fill(name)
  await page.getByLabel(/^My plant/).fill(plant)
  await page.getByRole('button', { name: 'Start my log' }).click()
  await page.locator('.learner-bar').waitFor()
}

/**
 * Chromium for the Log checks. Each new context answers the upload sync with
 * "ok", as a working endpoint would; sync.mjs tests the real thing.
 */
export async function launchWithSync() {
  const browser = await chromium.launch()
  const newContext = browser.newContext.bind(browser)
  browser.newContext = async (options) => {
    const ctx = await newContext(options)
    await ctx.route('**/api/sync**', (route) => route.fulfill({ status: 200, json: { ok: true } }))
    return ctx
  }
  return browser
}
