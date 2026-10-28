# Bright Ideas

A companion web app for the **miniAgriPV kit**. 7th graders build a mini agrivoltaic system: a small solar panel above a plant, powering an LED, a DC motor fan, and a water pump with alligator clips.

Live: https://fiodesygp.github.io/bright-ideas/

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

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and deploys it to GitHub Pages. In the repo settings, Pages → Source must be set to **GitHub Actions**.
