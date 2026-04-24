# Deploy smoke test

Manual checklist to run after the first successful GitHub Pages deploy.
URL assumes the default owner/repo; substitute `<user>` with the GitHub account.

## First load (desktop browser)

- [ ] Visit `https://<user>.github.io/kakeguruimasho/` — the app loads (no white page, no 404 on assets)
- [ ] Open DevTools Console — no red errors
- [ ] Network tab: `manifest.webmanifest`, `icons/icon-192.png`, `icons/icon-512.png`, `apple-touch-icon.png` all return 200
- [ ] Onboarding screen appears on a fresh visit (or in a Private/Incognito window)

## iOS Safari — Add to Home Screen

- [ ] On iPhone Safari, open the same URL
- [ ] Tap Share → Add to Home Screen
- [ ] The preview shows the Kakegurui icon (red square with gold ring + "K") and short name "Kakegurui"
- [ ] Tap Add — a home-screen icon appears
- [ ] Open the app from the home-screen icon — it launches fullscreen with no browser chrome (no address bar, no tab bar)
- [ ] Status bar reads correctly against the dark background

## Android Chrome — Add to Home Screen

- [ ] On Android Chrome, open the URL
- [ ] Menu → Add to Home Screen (or the install prompt when it appears)
- [ ] Icon appears on the home screen using the maskable icon (no white square around it on Pixel launcher)
- [ ] Launching from the home screen opens standalone

## Core flows

- [ ] Complete onboarding — lands on Home
- [ ] Create a habit from Habits tab
- [ ] Log the habit from Home (Quick-Log button)
- [ ] Hit the spin target and run a spin — wheel animates and lands on a reward
- [ ] View History/Activity — the log and spin appear

## Offline (SW cache)

- [ ] Fully quit the PWA from the app-switcher
- [ ] Turn on Airplane Mode
- [ ] Reopen the PWA from the home-screen icon — it still loads (shell + cached assets)
- [ ] Turn Airplane Mode back off

## Data portability

- [ ] Settings → Export JSON — a `.json` file downloads
- [ ] Remove the PWA (or wipe storage in Safari Settings → Advanced → Website Data)
- [ ] Reinstall from home screen
- [ ] Settings → Import JSON — select the earlier export; state (habits, spins, streak) is restored

## Version & update flow

- [ ] Make a trivial copy change on `main`; deploy runs automatically
- [ ] Reopen the already-installed PWA — the update prompt appears (`registerType: 'prompt'` in `vite.config.ts`)
- [ ] Accept the update — app reloads with the new version

---

If any step fails, capture a screenshot + the DevTools console output and file an issue.
