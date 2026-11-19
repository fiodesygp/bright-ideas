# Bright Ideas: rules for changes

The upload sync is live. Students' devices hold data that hasn't been uploaded yet. Losing it, or blocking its upload, can't be undone. These rules apply to every change.

## Data safety

- **Never delete, rename or reset** the Dexie database `bright-ideas` or its existing tables (`entries`, `learners`, `tombstones`, `meta`).
- **Schema changes go in a new `db.version(n)`** in `src/data/db.ts`. Its upgrade must keep existing learners, entries and photos, and their `dirty`, `syncedAt` and `photoDirty` flags.
- **Don't break the upload sync** (`src/data/sync.ts`, `api/sync.ts`). Records not yet uploaded must still upload after the change.
- **`api/sync.ts` rejects unknown fields.** If the app sends a new field before the server accepts it, every upload fails with a 400 and the queue stays stuck. Ship the client, server and SQL changes together.
- **New fields that should reach Supabase:**
  - Update `api/sync.ts` and `supabase/schema.sql`. The SQL change must be additive: `alter table … add column if not exists`.
  - Give the exact SQL to run. It must be run in Supabase before the change deploys.

## Before pushing

1. `npm run lint`, `npm run build` and `npm test` pass.
2. Run every check in `scripts/checks/` (see README, "Optional browser checks"):
   - `logform.mjs`, `edit.mjs`, `learners.mjs` and `learn.mjs`, against a normal build.
   - `sync.mjs` and `sunday.mjs`, against a build made with `VITE_SYNC_URL=http://localhost:5180/api/sync` and served on port 5173.
3. **If the change touches the Log form, the Dashboard or the PDF export**, also run the PDF check:
   - That means `src/components/log/*`, `src/pages/Log*`, `src/pages/Dashboard*`, `src/lib/exportPdf.ts` or `src/content/log.json`.
   - Run `node scripts/pdf-sample.mjs http://localhost:4173/bright-ideas/ sample.pdf`, then `verapdf --flavour ua1 sample.pdf`, and report the rule and check counts.
   - The steps are in README, "Checking PDF accessibility". `pdf-sample.mjs` fills in the real Log form, so renamed labels or messages can break it, and CI only finds out after the push.
