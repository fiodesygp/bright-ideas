# Bright Ideas

A companion web app for the **miniAgriPV kit**. 7th graders build a mini agrivoltaic system: a small solar panel above a plant, powering an LED, a DC motor fan, and a water pump with alligator clips.

Live: https://fiodesygp.github.io/bright-ideas/

## Features

1. **Planting Log**: a one-screen entry form, a history timeline (newest first), and a height-over-time chart. Export to PDF or PNG.
2. **Learn the Components**: flip cards for each kit part and four big-idea cards, plus a quick-check question on each part card (with a hint and retry, no score).
3. **Connect the Components**: step-by-step circuits, with one diagram and one instruction per step, then "Did it work?" and a troubleshooting checklist.

MVP status: circuits 1, 2 and 4 are built. Circuits 3, 5 and 6 are listed as "Coming soon".

## Privacy

There is no backend, no accounts and no analytics. Log entries and photos are stored in the browser's IndexedDB, and settings are kept in localStorage. **Settings → Clear all data** removes everything.

## Editing content (no code changes needed)

All learner-facing text lives in `src/content/`:

| File | What it holds |
|---|---|
| `home.json` | Driving question and Home links |
| `log.json` | Log field labels and the options (leaf colors, soil, weather, shade) |
| `prompts.json` | Reflection prompts. One is shown per entry, rotating in order. |
| `components.json` | Part cards (with quick checks) and concept cards |
| `circuits.json` | Circuits: parts, wires, steps, success text, troubleshooting |

To use a real photo on a part card, put the image in `public/photos/` and set `"photo": "photos/led.jpg"`. Write a matching `imageAlt`.

### Circuit diagrams

Each circuit's `diagram` places parts (`panel`, `led`, `resistor`, `motor`, `pump`) at x/y positions. Keep everything between x=30 and x=330, the visible area. Each wire connects two terminals:

- panel: `pos`, `neg`
- led: `anode` (long leg), `cathode` (short leg)
- resistor: `a`, `b`
- motor and pump: `pos`, `neg`

Each wire's `side` (`"+"` or `"-"`) sets its color: red for +, black for −. Every wire is also labeled + or −, so color is never the only cue. Use `via` points to route a wire around parts.

A step with `"wire": "w2"` adds and highlights that wire. A step with `highlightParts` outlines parts instead. The alt text for each diagram is generated from this data. Add `"alt"` to a step to override it.

## Development

```sh
npm install
npm run dev      # http://localhost:5173/bright-ideas/
npm run build    # type-check and build to dist/
npm run lint
```

Stack: React, TypeScript, Vite, React Router (HashRouter, so refreshes work on GitHub Pages), Dexie (IndexedDB), and vite-plugin-pwa (offline).

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and deploys it to GitHub Pages. In the repo settings, Pages → Source must be set to **GitHub Actions**.
