# Deployment Guide

Ship to GitHub Pages. Install on your iPhone. Done.

---

## Prerequisites

- A GitHub account.
- Either the `gh` CLI (`brew install gh`) or the GitHub web UI — both paths below.
- This repo cloned, with a clean `npm run build` locally.

The repo is pre-configured to build at base path `/kakeguruimasho/` (see `vite.config.ts` — the `base` option). If your repo name differs, change `base` to match.

---

## Step 1 — Push to GitHub and enable Pages

### Option A: gh CLI

```bash
gh repo create kakeguruimasho --public --source=. --remote=origin --push
```

Then enable Pages:

```bash
gh api -X POST repos/:owner/kakeguruimasho/pages \
  -f 'build_type=workflow'
```

### Option B: Web UI

1. Create a new public repo at `https://github.com/new` named **kakeguruimasho**.
2. Follow the "push an existing repository" instructions to push `main`.
3. Go to **Settings → Pages**.
4. Under **Build and deployment → Source**, pick **GitHub Actions**.

Either way, Pages is now wired to the deploy workflow that lives in `.github/workflows/deploy.yml` (owned by Phase 6). That workflow builds with `npm run build`, uploads `dist/` as a Pages artifact, and deploys on every push to `main`.

---

## Step 2 — First deploy

1. Push anything to `main` (or re-run the workflow from the Actions tab).
2. Open the **Actions** tab; the `deploy` workflow should be running. First run takes ~90s.
3. When it finishes, visit `https://<your-user>.github.io/kakeguruimasho/`.
4. You should see onboarding. If the page is blank, jump to Troubleshooting below.

> **Optional — cloud sync at build time.** The deploy workflow forwards `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_PARTYKIT_HOST` from GitHub Actions repository secrets into the Pages build. If either is unset the deployed site runs in single-device mode (no sign-in screen); if both are set, the same build gains real-time cross-device sync. See [`CLOUD_SYNC_SETUP.md`](CLOUD_SYNC_SETUP.md) for how to stand up the Clerk + PartyKit tier-free accounts and where to paste the values.

Verify the PWA is registered:

- Open Chrome/Safari devtools → Application → Service Workers. You should see `workbox` registered and active.
- Reload the page with network throttled to "Offline" — it should still load.

---

## Step 3 — Add to Home Screen on iPhone

> TODO: add screenshot.

![iOS Add to Home Screen](docs/screenshots/ios-install.png)

On the phone:

1. Open `https://<your-user>.github.io/kakeguruimasho/` in **Safari** (not Chrome — iOS Chrome can't install PWAs).
2. Tap the **Share** icon (square with arrow pointing up).
3. Scroll down in the share sheet and tap **Add to Home Screen**.
4. Name it (default is fine). Tap **Add**.
5. Launch the new home-screen icon. The app runs in standalone mode — no Safari chrome, full screen.

Installing the PWA does two important things:

- Enables real offline mode via the service worker cache.
- Signals iOS to persist your IndexedDB data longer (less eviction risk if you don't open the app for a few weeks).

---

## Step 4 — Custom domain (optional)

If you want to serve from `casino.example.com` instead of `*.github.io`:

1. In **Settings → Pages → Custom domain**, enter your domain and save. GitHub writes a `CNAME` file to your `gh-pages` branch.
2. At your DNS provider, add:
   - For an **apex domain** (`example.com`): four `A` records pointing to GitHub Pages' IPs (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`).
   - For a **subdomain** (`casino.example.com`): a single `CNAME` record pointing to `<your-user>.github.io`.
3. Wait for DNS propagation (minutes to a few hours). GitHub will show a green check when it sees the domain.
4. Tick **Enforce HTTPS** — GitHub provisions a Let's Encrypt cert for your domain for free.
5. **Update the Vite base path.** With a custom apex/subdomain, the app serves at `/`, not `/kakeguruimasho/`. Change `base: '/kakeguruimasho/'` to `base: '/'` in `vite.config.ts`, rebuild, and redeploy.

---

## Troubleshooting

### The page is white / assets 404

**Most likely cause:** base path mismatch. Open devtools → Network. If `index-*.js` is coming back as 404 because the browser requested `/kakeguruimasho/assets/...` but the server responded from `/...` (or vice versa), your `vite.config.ts` `base` doesn't match the deploy path.

- Default repo path (`<user>.github.io/kakeguruimasho/`) → `base: '/kakeguruimasho/'`
- Custom apex/subdomain → `base: '/'`

Fix, rebuild, redeploy.

### 404 on refresh / deep links

The app uses `HashRouter`, so URLs look like `/kakeguruimasho/#/habits`. This sidesteps GitHub Pages' SPA routing entirely — the browser never asks the server for `/habits`, only `/` with a hash. If you see a 404 on refresh, you're probably using `BrowserRouter` instead. Don't.

### Service worker won't update to the new version

By design. The PWA is configured with `registerType: 'prompt'` (see `DECISIONS.md` Q10/Q13). On a new deploy, the user sees a "new version available — reload" toast and must tap it to activate. If the toast never appears:

1. The SW hasn't detected the new version yet. Close the tab and reopen — `workbox-window` checks for updates on page load.
2. If you're testing: bump the version in `package.json`, rebuild, redeploy. The `vite-plugin-pwa` precache manifest changes, which triggers the SW update flow.
3. Last resort: in devtools → Application → Service Workers, hit **Unregister** and reload. This nukes the old SW and installs the new one fresh.

### The app works in dev but not in production

Usually this is an import path issue (case-sensitive on the Linux CI runner, case-insensitive on your Mac) or a missing asset in `public/`. Reproduce with `npm run preview` — that serves the production build locally and will catch most of these.

### iOS evicted my IndexedDB data

iOS Safari aggressively evicts storage for sites you haven't visited recently. Two mitigations:

1. **Install the PWA** (Step 3). Installed PWAs are much less likely to be evicted.
2. **Export your data** (Settings → Export) regularly — weekly is fine. If eviction happens, import restores everything.

---

## Verifying the deployment

After each deploy, spot-check:

- [ ] Home loads without console errors.
- [ ] Onboarding runs (or skip if you've completed it).
- [ ] Log a habit; a clip lands in your hand.
- [ ] Spin the wheel; the outcome animates and resolves.
- [ ] Reload; state persists.
- [ ] Airplane mode → reload; app still boots from cache.
- [ ] Devtools → Application → Manifest shows the icon + name correctly.
