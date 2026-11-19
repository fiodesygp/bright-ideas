# Bright Ideas

A companion web app for the **miniAgriPV kit**. 7th graders build a mini agrivoltaic system: a small solar panel above a plant, powering an LED, a DC motor fan, and a water pump with alligator clips.

## For facilitators

- **Open the app:** https://fiodesygp.github.io/bright-ideas/ or https://brightideas-agripv.vercel.app (the same app). Pick one link for your class and stick with it: each site keeps its own saved log, so entries made on one don't show up on the other.
- **Install it on a phone or tablet:** open the link once while online, then add it to the home screen.
  - iPhone or iPad (Safari): tap **Share**, then **Add to Home Screen**.
  - Android (Chrome): tap the **⋮** menu, then **Add to Home screen** (or **Install app**).
  - After that, it opens like an app and works without internet.
- **Privacy:** everything is saved on the device first, so the app works offline. When the device is online, students' names (first name or nickname), plants, log entries, photos and Sun Day runs are also uploaded to the project team's database (participants have consented to this). There are no accounts and no tracking. The Planting Log shows whether everything has been uploaded. Students on a shared device each add their name (first name or nickname) with **Who's logging?** on the Planting Log, and each sees only their own entries, Dashboard and PDF. **Settings → Remove my name and log from this device** deletes one student's name, entries and Sun Day runs; **Settings → Clear all data** erases everything on that device. Both also remove the names, notes and photos from the team's copy (and mark the runs deleted) the next time the device is online.
- **Before your first session:** check the kit facts in [FACILITATOR-CHECKLIST.md](FACILITATOR-CHECKLIST.md) against your real parts. Start with the first item: whether one panel can run the whole system.

## Features

1. **Planting Log**: an "About my log" card like the booklet cover (name, plant, start date), then an entry form (optional photo, date, height, the booklet's Soil and Water checklist, and notes) plus a list of recent entries. Several students can share a device with **Who's logging?**.
2. **My Dashboard**: summary cards, checklist counts ("Watered on 3 of 5 days"), a height-over-time chart, a photo timeline, and the full entry list with edit and delete. Export it as a tagged, text-based PDF (PDF/UA) or as a PNG image.
3. **Learn the Components**: flip cards for each kit part and four big-idea cards, plus a quick-check question on each part card (with a hint and retry, no score).
4. **Connect the Components**: six step-by-step circuits, with one diagram and one instruction per step, then "Did it work?" and a troubleshooting checklist.
5. **Sun Day** (`#/sun-day`, from the Home page): a simulation brought over from the Same Sun app. Students choose a plant, weather, panel size and height, and whether the fan and pump run; predict how the plant will grow compared with one in full sun, and why; run a day or a week with a moving scene and gauges; then get a Sun Score (food + energy, out of 200) with feedback, hints, and three challenges. Every run is saved under **My Sun Day runs** for the learner picked in **Who's logging?**. The numbers are estimates for learning, not measurements; every model number is in `src/sim/model.json`.

Kit-specific facts (polarity, wire colors, resistor value, panel power) must be checked against the real kit. See [FACILITATOR-CHECKLIST.md](FACILITATOR-CHECKLIST.md).

## Privacy

The app is local-first, with one small backend for uploads, and no accounts or analytics. Names, log entries and photos are stored in the browser's IndexedDB, and settings (including who is logging now) are kept in localStorage. In the background, the app uploads learners, entries, photos and Sun Day runs to the project team's Supabase database through `api/sync.ts`, a Vercel Function (see [Upload sync](#upload-sync)). The browser never holds a Supabase key. Each entry stores the learner's id, not their name, so renaming updates everywhere. Entries saved before names existed go to the first learner added on that device. **Settings → Remove my name and log from this device** deletes the current learner and only their entries and Sun Day runs; **Settings → Clear all data** removes everything. In Supabase, deletes are soft: the row stays with `deleted_at` set, its name, plant or note is blanked, and its photo is deleted. Sun Day runs hold no free text, only choices and scores, so they are just marked deleted.

## Editing content (no code changes needed)

Most learner-facing text lives in `src/content/` (the rest of the Settings page is still in `src/pages/Settings.tsx`):

| File | What it holds |
|---|---|
| `home.json` | Driving question and Home links |
| `log.json` | Log form labels and checklist, "About my log" and "Who's logging?", announcements, Dashboard intro and counts, PDF labels, and the empty-state text. `{name}`-style slots are filled in by the app |
| `sunday.json` | All Sun Day text: steps, choices, gauges, prediction, results, feedback rules and hints, challenges, and "My Sun Day runs" |
| `settings.json` | Settings text about learners: "Remove my name and log", its confirmation, the Clear all data warning, and the shared-device facilitator note |
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
npm test         # Sun Day model unit tests (Node's built-in test runner, no extra packages)
npm run lint
```

Stack: React, TypeScript, Vite, React Router (HashRouter, so refreshes work on GitHub Pages), Dexie (IndexedDB), a Vercel Function with `@supabase/supabase-js` for uploads, vite-plugin-pwa (offline), PDFKit (tagged PDF export), and html-to-image (PNG export). Encode Sans is self-hosted through `@fontsource`, so the app makes no font requests and works offline.

**Before committing a change to the Log form, the Dashboard or the PDF export**, run the sample export and veraPDF locally, as described in [By hand with veraPDF](#checking-pdf-accessibility) below. `scripts/pdf-sample.mjs` fills in the real Log form, so a renamed label or message can break it, and CI only finds out after the push.

### Optional browser checks

`scripts/checks/` has Playwright scripts for the Planting Log, Sun Day and the upload sync. They are not part of the build or CI, and Playwright is not a project dependency: `npx` downloads the pinned versions into a temporary folder.

- `logform.mjs` checks the Log form at 360, 768 and 1280 px in light and dark mode, with and without a photo, and with old entries already saved. It covers field order, the "Photo added", "Photo removed" and "Saved" announcements, focus, axe (WCAG 2.2 AA), 44 px targets, sideways scrolling, and reduced motion.
- `edit.mjs` checks editing an entry on the Dashboard: field order, checklist ticks, Remove photo, the "Changes saved" announcement, and focus returning to the Edit button.
- `sunday.mjs` checks Sun Day: the name prompt on a fresh device, choosing a design (keyboard too), predicting, running the day (announcements, focus on Skip, then on the Sun Score), hints, a challenge with locked choices, reduced motion, "My Sun Day runs" (newest first, per learner), the upload to the local test server, and axe in light and dark at 320 and 1280 px. It needs the same build as `sync.mjs` (below).
- `learners.mjs` checks "About my log" and shared devices at the same sizes and themes: a fresh device, two learners with their own entries, switching ("Switched to …'s log"), renaming, the Dashboard checklist counts, deleting a learner, Settings → Remove my name and log, and old entries going to the first learner.

With the dev server running (`npm run dev`), in a second terminal:

```sh
npx -y playwright@1.64.1 install chromium   # once, downloads the browser
npx -y -p playwright@1.64.1 -p @axe-core/playwright@4.14.0 node scripts/checks/logform.mjs
npx -y -p playwright@1.64.1 -p @axe-core/playwright@4.14.0 node scripts/checks/edit.mjs
npx -y -p playwright@1.64.1 -p @axe-core/playwright@4.14.0 node scripts/checks/learners.mjs
```

These three answer the upload endpoint with "ok" themselves. `sync.mjs` checks the real sync instead, against a fake Supabase (`sync-server.mjs`, in memory) and `api/sync.ts` itself on port 5180. It covers backfill of data saved by earlier versions (v1, v2, and v3 with records still queued), the device id, Sun Day run uploads and deletes, offline save then upload on reconnect, edits (the photo is uploaded again only when it changed), entry and learner deletes, Clear all data, the status line and its announcements, and the endpoint's checks on what it accepts. It needs a build that posts to that port, served on port 5173:

```sh
VITE_SYNC_URL=http://localhost:5180/api/sync npm run build
npx vite preview --port 5173 --strictPort
# second terminal
npx -y -p playwright@1.64.1 -p @axe-core/playwright@4.14.0 node scripts/checks/sync.mjs
npx -y -p playwright@1.64.1 -p @axe-core/playwright@4.14.0 node scripts/checks/sunday.mjs
```

Each script prints PASS or FAIL per check and ends with `ALL PASSED` or the number that failed, and exits non-zero on any failure. To test another server, pass its URL, for example `… node scripts/checks/logform.mjs http://localhost:4173/bright-ideas/`. `logform.mjs`, `learners.mjs` and `sunday.mjs` save screenshots to `bright-ideas-checks` in your system temp folder; set `SHOTS_DIR` to put them somewhere else. Don't commit them. `scripts/checks/shots/` is git-ignored if you want them next to the scripts.

## Design tokens

Every color is a CSS variable in `src/index.css`, with a light set and a matching dark set. The dark set is used when Settings → Theme is "Dark", or when it is "System" and the device is dark. The brand colors (`--brand-green`, `--brand-lime`, `--brand-teal`) are for decoration only. They are about 2:1 on white, so text and buttons use the deeper `--primary` and `--teal-ink` shades, which meet WCAG AA. Circuit diagrams always draw on light `--paper`, so the red and black wires match the real kit in both themes.

## Checking PDF accessibility

The Dashboard's "Save as PDF" makes a tagged PDF that targets PDF/UA-1. It has real headings, a list, and paragraphs, with alt text on the chart and photos. Characters the embedded font can't draw (emoji, non-Latin scripts) are left out of the PDF only, and a line under that entry says so.

**Automatic:** `.github/workflows/pdf-ua.yml` runs on every push and pull request. It builds the app, exports a sample PDF with `scripts/pdf-sample.mjs`, and validates it with [veraPDF](https://verapdf.org) using the PDF/UA-1 profile. The sample PDF and the HTML report are saved as the `pdf-ua-sample` artifact on each run.

> **For developers:** a red "PDF/UA check" means the Dashboard's PDF export has an accessibility problem, or that `scripts/pdf-sample.mjs` could not make the sample PDF at all (for example after a Log form change). It does not block the site, which deploys separately. To see what failed, open the run under **Actions → PDF/UA check**. If the "Export a sample PDF" step is red, the script broke: its log shows where. Otherwise scroll to **Artifacts**, download `pdf-ua-sample`, and open `verapdf-report.html`.

**By hand with veraPDF** (needs Java 11 or later):

```sh
npm run build && npx vite preview --port 4173 &
npm i --no-save playwright && npx playwright install chromium
node scripts/pdf-sample.mjs http://localhost:4173/bright-ideas/ sample.pdf
verapdf --flavour ua1 sample.pdf     # prints PASS or FAIL; exit code 1 on FAIL
```

Install veraPDF from https://docs.verapdf.org/install/. You can also open any exported PDF in the veraPDF GUI and choose the "PDF/UA-1" profile.

**By hand with PAC** (Windows): download the free [PAC (PDF Accessibility Checker)](https://pac.pdf-accessibility.org) and open an exported PDF. PAC checks PDF/UA and the Matterhorn Protocol, and its "Screen reader preview" shows the reading order. Some PAC checkpoints need a human to judge them, for example whether the alt text is meaningful. Review those by hand.

## Upload sync

The app saves everything on the device first. `src/data/sync.ts` then uploads it in the background to `api/sync.ts`, a Vercel Function that writes to Supabase with the secret key. The browser never talks to Supabase and never holds a key.

- **What's sent:** learners (name, plant, start date), entries (date, height, checklist, note, photo), Sun Day runs (the design, challenge, prediction and reason, how the plant really grew, and the scores), and deletions. Each record is filed under a random device id (`bright-ideas:deviceId` in localStorage, with a copy in IndexedDB) and its local id.
- **When:** at start, about 1.5 s after any change, when the device comes back online, and when the app is shown again. A failed upload stays queued and is retried with backoff (5 s, doubling, up to 5 min). Saving never waits for it.
- **Bookkeeping:** Dexie hooks mark every new or changed learner, entry and Sun Day run `dirty` (and `photoDirty` when the photo changed), and every delete writes a tombstone. `dirty` is cleared only after the server confirms. The version 3 upgrade marks everything already on a device as dirty, so it is uploaded once ("backfill"). Version 4 only adds the `sunDayRuns` table and leaves the rest, including anything still waiting to upload, as it was.
- **Requests:** learners, then photos, then entries, then Sun Day runs, then deletions. Text records go in batches of 50 as JSON. Each photo goes alone as `image/jpeg` (`?device=…&entry=…`), so requests stay under Vercel's 4.5 MB limit.
- **What the endpoint accepts:** cross-origin calls only from the Vercel site, GitHub Pages and `http://localhost:5173` (same-origin calls from any Vercel deployment, including previews, also work). It rejects unknown fields, checks every field's type and length (notes up to 1000 characters, names up to 30), and accepts only JPEG photos up to 2 MB. A Sun Day run must use a plant, weather, panel and challenge from `src/sim/model.json`, a known height, guess and reason, and whole-number scores in range (food, energy and the no-panel score 0–100, Sun Score 0–200). Uploads from older app versions, which never send runs, are accepted as before. It has no login, so anyone who copies the app's requests could still send junk: review the data with that in mind. It also allows 60 requests per minute per IP (set `SYNC_RATE_LIMIT_PER_MINUTE` to change it) and answers 429 with `Retry-After` beyond that; the app just waits that long and tries again. The count lives in each function instance's memory, so it is best effort: Vercel may run several instances, and a cold start resets it. A whole class behind one school IP shares the limit, so the start of a lesson may upload a little later.
- **Deletes** are soft: `deleted_at` is set, the learner's name and plant or the entry's note are blanked, and the photo file is deleted. A deleted Sun Day run only gets `deleted_at`. Deleting a learner (or Clear all data) deletes their runs too.
- **Status:** the Planting Log shows "All entries uploaded", "N waiting to upload" (this counts Sun Day runs too) or "Offline — will upload later", and announces a change once it has lasted 2 s.
- **Service worker:** uploads are POSTs, which Workbox never caches, and `/api/` is excluded from the offline page fallback.

### Setting up Supabase

1. In the Supabase dashboard, open **SQL Editor → New query**, paste all of `supabase/schema.sql`, and click **Run**. It creates the `devices`, `learners`, `entries` and `sun_day_runs` tables (RLS on, no policies), the private `log-photos` bucket (JPEG, 2 MB max), and the `entries_readable` and `sun_day_runs_readable` views. It's safe to run again.
   - **Already set up before Sun Day?** Run `supabase/migrations/2026-11-sun-day-runs.sql` instead. It only adds the `sun_day_runs` table and its view. Run it before the Sun Day version deploys. Until the table exists, Sun Day runs (and deletions, which are sent after them) fail and wait in the queue. Learners, entries and photos still upload.
2. In **Project Settings → API Keys**, copy a **secret** key (`sb_secret_…`). Don't use the publishable key anywhere.
3. In Vercel, under **Settings → Environment Variables**, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (the secret key) for Production and Preview, then redeploy. `.env.example` lists every variable.
4. Review uploads in **Table Editor → entries_readable** and **sun_day_runs_readable**. Photos are in **Storage → log-photos**, under `{device_id}/{entry local_id}.jpg`.
5. To remove test data (for example from a preview deployment), delete the device's folder in **Storage → log-photos**, then put its id at the top of `supabase/cleanup-test-data.sql` and run it. It hard-deletes that device's rows (Sun Day runs included) and reports any photos still left. Supabase doesn't allow deleting Storage files from SQL, which is why the photos go first, through the dashboard.

`VITE_SYNC_URL` sets where the app posts. Leave it unset on Vercel: the app uses `/api/sync` on the same site. The GitHub Pages workflow sets it to `https://brightideas-agripv.vercel.app/api/sync`.

## Deploying

The same code deploys to two places. Only the base path differs, and `vite.config.ts` picks it automatically.

| Host | Live URL | Base path |
| --- | --- | --- |
| GitHub Pages | https://fiodesygp.github.io/bright-ideas/ | `/bright-ideas/` |
| Vercel | https://brightideas-agripv.vercel.app | `/` |

The base also sets the PWA's `scope`, `start_url`, and offline fallback. The app uses `HashRouter`: routes live after the `#` (for example `…/#/log/dashboard`), so the router needs no basename and neither host needs rewrite rules. That's why there is no `vercel.json`.

**GitHub Pages** (https://fiodesygp.github.io/bright-ideas/). Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app (with `VITE_SYNC_URL` pointing at the Vercel endpoint, since Pages has no server) and deploys it. In the repo settings, Pages → Source must be set to **GitHub Actions**. The PDF/UA check runs as a separate workflow, so it never blocks a deploy.

**Vercel** (https://brightideas-agripv.vercel.app). Import the repo in Vercel and keep the detected Vite preset: build command `npm run build`, output directory `dist`. Vercel sets `VERCEL=1` during its builds, which switches the base to `/`. Vercel then redeploys on every push to `main`, and makes a preview deployment for other branches. It also deploys `api/sync.ts` as a function; set its environment variables as described in [Setting up Supabase](#setting-up-supabase).

To check a build locally:

```sh
npm run build && npx vite preview                # http://localhost:4173/bright-ideas/
VERCEL=1 npm run build && VERCEL=1 npx vite preview   # http://localhost:4173/
```
