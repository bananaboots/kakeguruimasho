# Phase 6 — Deployment notes

Wires CI + GitHub Pages deploy, generates placeholder PWA icons, and
verifies the build serves correctly at the base path.

## Shipped

### Workflows (`.github/workflows/`)

- **`ci.yml`** — runs on PR + push to `main`:
  lint → typecheck → vitest → `vite build` → bundle-size gate → Playwright (chromium).
  The bundle gate fails the job if `dist/assets/index-*.js` exceeds
  100 KB gzipped. Uploads the Playwright HTML report on failure.
- **`deploy.yml`** — runs on push to `main`:
  same build steps, then `actions/configure-pages@v5` +
  `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`.
  Uses `permissions: contents:read / pages:write / id-token:write`
  and a `pages` concurrency group with `cancel-in-progress: true`.

### `package.json` scripts

Added: `typecheck`, `test`, `test:watch`, `test:e2e`, `test:e2e:ui`, `generate-icons`.
(The old `e2e` alias is removed in favor of `test:e2e`.)

### PWA icons (`public/icons/`, `public/apple-touch-icon.png`)

ImageMagick was not available, so the generator uses `sharp`
(added as a devDependency) to rasterize a tiny inline SVG.

- `icons/icon-192.png` (7.2 KB), `icons/icon-512.png` (24 KB)
- `icons/maskable-192.png`, `icons/maskable-512.png` — 20% safe-zone inset
- `apple-touch-icon.png` (180×180)

Design: deep red `#E53935` background, gold `#FFD700` ring accent, white
serif "K" monogram. Script lives at `scripts/generate-icons.mjs` and is
exposed via `npm run generate-icons`.

The `vite-plugin-pwa` manifest in `vite.config.ts` already references
`icons/icon-*.png` and `icons/maskable-*.png`, so the build picks them
up automatically. The `apple-touch-icon.png` lives at the public-root
path Safari looks up by convention.

### Docs

- `DEPLOY_SMOKE_TEST.md` — manual post-deploy checklist for the owner
  (desktop load, iOS + Android install, offline, import/export, update flow).

## Verified locally

- `npm run typecheck` — passes.
- `npm run test` — 284/284 vitest tests pass across 42 files.
- `npm run build` — passes. Main chunk: **267.27 KB raw / 86.42 KB gz**
  (well under the 100 KB gate; matches `AUDIT.md`).
- `npm run preview` — served `http://localhost:4173/kakeguruimasho/`
  with status 200; manifest + all four icons + apple-touch-icon return 200.
- `dist/index.html` references assets with the `/kakeguruimasho/` prefix.
- Bundle-size gate shell pipeline (`gzip -c dist/assets/index-*.js | wc -c`)
  returns 86259 bytes locally → PASS.
- `HashRouter` confirmed in `src/main.tsx` (no client-side 404 on GH Pages).

## Known issues to flag for the owner

- **`npm run lint` currently fails** with 21 errors + 14 warnings across
  files touched by earlier phases (e.g. `toast.tsx` react-refresh rule,
  several `react-hooks/refs`/`exhaustive-deps` issues, unused
  `eslint-disable` directives). These pre-date Phase 6 — none were
  introduced by this phase. CI will surface them on the first run;
  consider a follow-up cleanup pass (low risk, mostly mechanical fixes)
  or relax the specific rules if they were intentional.
- **Icons are placeholders.** Acceptable for initial launch and unblocks
  the manifest, but replace before any public announcement — ideally via
  `pwa-asset-generator` from a real vector source per ARCHITECTURE §9.2.
- **Sharp** adds ~6 transitive packages and the `npm audit` output noted
  4 high-severity advisories in its dep chain. It's dev-only and only
  runs on the icon-generation script, so the runtime bundle is unaffected.

## Owner next steps (NOT done here per scope)

1. Push to GitHub; enable Pages in repo Settings → Pages →
   Source: **GitHub Actions** (not "Deploy from a branch").
2. Merge to `main` (or push) — `deploy.yml` fires automatically.
3. Run through `DEPLOY_SMOKE_TEST.md` end-to-end.
4. (Optional) Address the pre-existing lint errors so CI stays green.
5. (Optional) Swap the placeholder icons for final art.
