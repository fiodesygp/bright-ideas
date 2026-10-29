# Bright Ideas

A companion web app for the **miniAgriPV kit**. 7th graders build a mini agrivoltaic system: a small solar panel above a plant, powering an LED, a DC motor fan, and a water pump with alligator clips.

## For facilitators

- **Open the app:** https://fiodesygp.github.io/bright-ideas/
- **Install it on a phone or tablet:** open the link once while online, then add it to the home screen.
  - iPhone or iPad (Safari): tap **Share**, then **Add to Home Screen**.
  - Android (Chrome): tap the **⋮** menu, then **Add to Home screen** (or **Install app**).
  - After that, it opens like an app and works without internet.
- **Privacy:** all data stays on the device. Log entries and photos are saved in the browser on that phone or tablet. Nothing is sent anywhere, and there are no accounts or tracking. Each device keeps its own log, so students on shared devices should save a PDF from their Dashboard before someone else uses it. **Settings → Clear all data** erases everything on that device.
- **Before your first session:** check the kit facts in [FACILITATOR-CHECKLIST.md](FACILITATOR-CHECKLIST.md) against your real parts. Start with the first item: whether one panel can run the whole system.

## Features

1. **Planting Log**: a four-field entry form (date, height, notes, and an optional photo) plus a list of recent entries.
2. **My Dashboard**: summary cards, a height-over-time chart, a photo timeline, and the full entry list with edit and delete. Export it as a tagged, text-based PDF (PDF/UA) or as a PNG image.
3. **Learn the Components**: flip cards for each kit part and four big-idea cards, plus a quick-check question on each part card (with a hint and retry, no score).
4. **Connect the Components**: six step-by-step circuits, with one diagram and one instruction per step, then "Did it work?" and a troubleshooting checklist.

Kit-specific facts (polarity, wire colors, resistor value, panel power) must be checked against the real kit. See [FACILITATOR-CHECKLIST.md](FACILITATOR-CHECKLIST.md).

## Privacy

There is no backend, no accounts and no analytics. Log entries and photos are stored in the browser's IndexedDB, and settings are kept in localStorage. **Settings → Clear all data** removes everything.

## Editing content (no code changes needed)

All learner-facing text lives in `src/content/`:

| File | What it holds |
|---|---|
| `home.json` | Driving question and Home links |
| `log.json` | Log form labels, Dashboard intro, and the empty-state text |
| `components.json` | Part cards (with quick checks) and concept cards |
| `circuits.json` | Circuits: parts, wires, steps, success text, troubleshooting |

To use a real photo on a part card, put the image in `public/photos/` and set `"photo": "photos/led.jpg"`. Write a matching `imageAlt`.

### Circuit diagrams

Each circuit's `diagram` places parts (`panel`, `led`, `resistor`, `motor`, `pump`, and `water`, a cup drawn behind the pump) at x/y positions. By default the visible area runs from x=30 to x=330; set `viewX` and `viewWidth` to change it. Each part may also set `rotate` (for example, `-90` lays a resistor flat) and `labelSide` (`above`, `below`, `left` or `right`) to move its label. Each wire connects two terminals:

- panel: `pos`, `neg`
- led: `anode` (long leg), `cathode` (short leg)
- resistor: `a`, `b`
- motor and pump: `pos`, `neg` (the pump's terminals are on top, above the water)

Each wire's `side` (`"+"` or `"-"`) sets its color: red for +, black for −. Every wire is also labeled + or −, so color is never the only cue. Use `via` points to route a wire around parts.

A step with `"wire": "w2"` adds and highlights that wire. A step with `highlightParts` outlines parts instead. Add `"kind": "safety"` to show a step as a safety warning. The alt text for each diagram is generated from this data. Add `"alt"` to a step to override it.

## Development

```sh
npm install
npm run dev      # http://localhost:5173/bright-ideas/
npm run build    # type-check and build to dist/
npm run lint
```

Stack: React, TypeScript, Vite, React Router (HashRouter, so refreshes work on GitHub Pages), Dexie (IndexedDB), vite-plugin-pwa (offline), PDFKit (tagged PDF export), and html-to-image (PNG export). Encode Sans is self-hosted through `@fontsource`, so the app makes no font requests and works offline.

## Design tokens

Every color is a CSS variable in `src/index.css`, with a light set and a matching dark set. The dark set is used when Settings → Theme is "Dark", or when it is "System" and the device is dark. The brand colors (`--brand-green`, `--brand-lime`, `--brand-teal`) are for decoration only. They are about 2:1 on white, so text and buttons use the deeper `--primary` and `--teal-ink` shades, which meet WCAG AA. Circuit diagrams always draw on light `--paper`, so the red and black wires match the real kit in both themes.

## Checking PDF accessibility

The Dashboard's "Save as PDF" makes a tagged PDF that targets PDF/UA-1. It has real headings, a list, and paragraphs, with alt text on the chart and photos. Characters the embedded font can't draw (emoji, non-Latin scripts) are left out of the PDF only, and a line under that entry says so.

**Automatic:** `.github/workflows/pdf-ua.yml` runs on every push and pull request. It builds the app, exports a sample PDF with `scripts/pdf-sample.mjs`, and validates it with [veraPDF](https://verapdf.org) using the PDF/UA-1 profile. The sample PDF and the HTML report are saved as the `pdf-ua-sample` artifact on each run.

> **For developers:** a red "PDF/UA check" means the Dashboard's PDF export has an accessibility problem. It does not block the site, which deploys separately. To see what failed, open the run under **Actions → PDF/UA check**, scroll to **Artifacts**, download `pdf-ua-sample`, and open `verapdf-report.html`.

**By hand with veraPDF** (needs Java 11 or later):

```sh
npm run build && npx vite preview --port 4173 &
npm i --no-save playwright && npx playwright install chromium
node scripts/pdf-sample.mjs http://localhost:4173/bright-ideas/ sample.pdf
verapdf --flavour ua1 sample.pdf     # prints PASS or FAIL; exit code 1 on FAIL
```

Install veraPDF from https://docs.verapdf.org/install/. You can also open any exported PDF in the veraPDF GUI and choose the "PDF/UA-1" profile.

**By hand with PAC** (Windows): download the free [PAC (PDF Accessibility Checker)](https://pac.pdf-accessibility.org) and open an exported PDF. PAC checks PDF/UA and the Matterhorn Protocol, and its "Screen reader preview" shows the reading order. Some PAC checkpoints need a human to judge them, for example whether the alt text is meaningful. Review those by hand.

## Deploying

The same code deploys to two places. Only the base path differs, and `vite.config.ts` picks it automatically.

| Host | Live URL | Base path |
| --- | --- | --- |
| GitHub Pages | https://fiodesygp.github.io/bright-ideas/ | `/bright-ideas/` |
| Vercel | https://brightideas-agripv.vercel.app | `/` |

The base also sets the PWA's `scope`, `start_url`, and offline fallback. The app uses `HashRouter`: routes live after the `#` (for example `…/#/log/dashboard`), so the router needs no basename and neither host needs rewrite rules. That's why there is no `vercel.json`.

**GitHub Pages.** Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and deploys it. In the repo settings, Pages → Source must be set to **GitHub Actions**. The PDF/UA check runs as a separate workflow, so it never blocks a deploy.

**Vercel.** Import the repo in Vercel and keep the detected Vite preset: build command `npm run build`, output directory `dist`. Vercel sets `VERCEL=1` during its builds, which switches the base to `/`. Vercel then redeploys on every push to `main`.

To check a build locally:

```sh
npm run build && npx vite preview                # http://localhost:4173/bright-ideas/
VERCEL=1 npm run build && VERCEL=1 npx vite preview   # http://localhost:4173/
```
