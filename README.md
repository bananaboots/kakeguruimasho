# kakeguruimasho

A gamified habit tracker that applies slot-machine psychology to the habits you actually want to do. Earn paperclips, cash them in for bigger rewards, spin the wheel, chase the gold clip. A mobile-first, offline-capable PWA that lives on your home screen.

Based on SpoonFedStudy's "Slot Machine Habit System" methodology.

---

## Screenshots

> TODO: add screenshots (these file paths are placeholders).

![Home](docs/screenshots/home.png)
![Spin flow](docs/screenshots/spin.png)
![Jar progress](docs/screenshots/jar.png)
![Bonus timer](docs/screenshots/bonus.png)
![Settings](docs/screenshots/settings.png)

---

## Quick start

```bash
git clone https://github.com/<your-user>/kakeguruimasho.git
cd kakeguruimasho
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`). The first run triggers onboarding.

## Build + deploy

```bash
npm run build     # type-check + Vite build → dist/
npm run preview   # serve the production build locally
```

Pushing to `main` triggers the GitHub Actions workflow which builds and publishes to GitHub Pages automatically. The site serves at `https://<your-user>.github.io/kakeguruimasho/`. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the full setup (including custom domains and iOS Add-to-Home-Screen).

## Tech stack

- React 19 + TypeScript (strict) on Vite 7
- Zustand for state, IndexedDB (via `idb`) for durable persistence
- Tailwind CSS v4 + shadcn-style primitives
- Framer Motion for the wheel + jar animations
- `vite-plugin-pwa` for service worker + installable manifest
- Vitest + React Testing Library for unit/component tests; Playwright for E2E + axe-core a11y

## Documentation

- [`SPEC.md`](SPEC.md) — full product specification (authoritative rules)
- [`USER_GUIDE.md`](USER_GUIDE.md) — plain-language walkthrough for the owner/player
- [`DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md) — fork/modify/run locally
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — GitHub Pages + iOS install
- [`CHANGELOG.md`](CHANGELOG.md) — release history
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — data schema, state topology, module boundaries
- [`DECISIONS.md`](DECISIONS.md) — authoritative answers to spec open questions

## License

MIT. See [`LICENSE`](LICENSE).
