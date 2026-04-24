# Cloud Sync Setup

Real-time cross-device sync — sign in once, same jar follows you to any device.

The plumbing is scaffolded in this repo; you need to stand up two free
accounts (Clerk for auth, PartyKit for the Yjs relay) and drop the
resulting keys into `.env`. Total time: ~15 minutes. Total cost: $0 for
personal/family-scale use.

If you skip this setup the app keeps working in legacy single-device
mode — the sign-in screen never appears and data stays in the local
IndexedDB store exactly like before.

---

## What you need to do

### 1. Clerk account (auth)

1. Create a free account at https://dashboard.clerk.com/sign-up.
2. Click **Create application**. Name it whatever ("Kakegurui Masho").
3. Under sign-in options, enable **Email** → **Email verification code**
   or **Email magic link** (your call — magic link is less typing on
   mobile). Disable Password unless you want it.
4. Disable every other provider (Google, Apple, etc.) unless you want
   them. Less surface area = simpler.
5. Click **Create application**.
6. On the **API Keys** screen copy:
   - **Publishable key** (starts with `pk_test_…` or `pk_live_…`)
   - **Secret key** (starts with `sk_test_…` or `sk_live_…`)
7. Keep the tab open — you'll need the secret key again in step 3.

### 2. PartyKit account (sync relay)

PartyKit is a thin wrapper over Cloudflare Workers. The free tier
covers 100k requests/day, which is way more than you'll use.

1. Log in:
   ```bash
   npx partykit login
   ```
   This opens a browser and links your GitHub account. No billing info
   required.

### 3. Deploy the sync server

From the repo root:

```bash
# Push the Clerk secret key so the server can verify JWTs.
# PartyKit will prompt you to paste the sk_… value from Clerk.
npx partykit env add CLERK_SECRET_KEY -n kakeguruimasho-sync

# Deploy. First run asks for a project name — accept the default
# (kakeguruimasho-sync) or pick your own.
npx partykit deploy
```

> Heads up: earlier PartyKit releases used `partykit secret put`; the
> current CLI (≥ 0.0.115) moved it to `partykit env add`. If you see the
> help text dump instead of a prompt, you're on the newer CLI — use the
> `env add` form. Never paste the secret directly on the command line or
> in chat; always let the prompt read it so it doesn't land in shell
> history or transcripts.

When it finishes, partykit prints a URL like:

```
  Deployed to https://kakeguruimasho-sync.<your-user>.partykit.dev
```

Copy the host (everything after `https://`). You need it in step 4.

### 4. Wire the client

Create a `.env` file at the repo root (gitignored):

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...               # from step 1.6
VITE_PARTYKIT_HOST=kakeguruimasho-sync.<user>.partykit.dev   # from step 3
```

Run the app:

```bash
npm run dev
```

You should see the Clerk sign-in screen. Sign in with email; verify via
the code/link. Once signed in the app loads and starts syncing in the
background.

### 5. Deploy the client

Push to `main` as usual. GitHub Actions rebuilds and redeploys Pages.

> **Important:** add the same two env vars to the GitHub Actions build
> as repository secrets, otherwise the deployed site will fall back to
> local-only mode. In GitHub → Settings → Secrets and variables →
> Actions → New repository secret:
> - `VITE_CLERK_PUBLISHABLE_KEY`
> - `VITE_PARTYKIT_HOST`
>
> Then update `.github/workflows/deploy.yml` to forward those into the
> `npm run build` step as env vars. (Not wired up yet — see the TODO
> at the bottom of this file.)

### 6. Test real-time sync

1. Open the site on your phone, sign in.
2. Log a habit.
3. Open the site on your laptop, sign in with the same email.
4. The laptop should show the clip you just earned within a second or
   two. Edit the jar on the laptop — your phone should update too.

---

## Architecture

```
┌──────────────┐     WebSocket (Yjs sync protocol)     ┌──────────────────┐
│ iPhone PWA   │◀────────────────────────────────────▶│ PartyKit worker  │
│              │                                       │ (party/sync.ts)  │
│ Y.Doc ─ y-indexeddb (local cache)                    │ room = userId    │
│   ▲                                                   │ verifies Clerk   │
│   │ bridgeStoreAndDoc()                              │ JWT on connect   │
│   ▼                                                   └──────────────────┘
│ Zustand store ─ React UI                                     ▲
│                                                              │ sk_... key
│ Clerk JS ─ signIn/signOut, getToken() ───────────────────────┘
└──────────────┘
```

File map:

| File                       | What it does                                          |
| -------------------------- | ----------------------------------------------------- |
| `party/sync.ts`            | PartyKit server; verifies Clerk JWT, delegates to y-partykit |
| `partykit.json`            | PartyKit project config                               |
| `src/sync/provider.ts`     | `useSyncConnection()` hook; owns the Y.Doc            |
| `src/sync/bridge.ts`       | Serializes AppState into the Y.Doc and back           |
| `src/sync/SyncGate.tsx`    | Wraps the app in Clerk; gates sign-in                 |
| `src/main.tsx`             | Mounts `<SyncGate>` around `<App>`                    |
| `.env.example`             | Template; copy to `.env` and fill in                  |

---

## Known limitation — merge semantics

The current scaffold stores the full `AppState` as one JSON blob inside
a Yjs `Y.Map` entry. That means real-time sync works, but if two devices
make **concurrent offline edits** (both offline, both modifying state),
the later write wins at the map-entry level when they reconnect — we
lose the granular CRDT merge a per-slice Yjs mapping would give.

For the intended usage (one primary user, one primary device at a time)
this is almost never observable. The proper fix — move `history_events`
to a `Y.Array` and rebuild `AppState` as a derived view — is tracked as
Phase 7 follow-up. Until then, keep using `Settings → Export` weekly as
a belt-and-suspenders backup.

---

## Troubleshooting

**Sign-in screen loops / never completes.** Make sure the Clerk domain
in the dashboard (Settings → Domains) matches where you're running the
app. For `localhost` dev it should "just work"; for the GH Pages deploy
add `<user>.github.io/kakeguruimasho` as a satellite domain.

**Websocket errors in the console (401).** The Clerk secret key on
PartyKit doesn't match the publishable key in the client. Run
`npx partykit env add CLERK_SECRET_KEY -n kakeguruimasho-sync` again with the right value
and redeploy.

**App works but data doesn't sync across devices.** Check devtools →
Network → WS. If there's no websocket to `*.partykit.dev`, the client
is in local-only mode — `VITE_PARTYKIT_HOST` is probably missing from
the build's env.

**"wrong room" 403.** The room id the client opens must equal the
Clerk user id. If you're seeing this, the client's `useAuth().userId`
and the JWT's `sub` claim disagree — probably a stale Clerk session;
sign out and back in.

---

## TODO

- [ ] Forward `VITE_CLERK_PUBLISHABLE_KEY` + `VITE_PARTYKIT_HOST` to
      `.github/workflows/deploy.yml` so the Pages build picks them up.
- [ ] Phase 7: move `history_events` to `Y.Array`; rebuild `AppState`
      as a derived view for proper offline-merge semantics.
- [ ] Add a "sync status" indicator in the top bar (connected / offline
      / syncing…).
