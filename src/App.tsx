/**
 * App — route tree + shell (3J + 3H).
 *
 * Structure per ARCHITECTURE §6:
 *   <App>
 *     <BonusTimerBanner />          [3H] — sticky, visible when active timers > 0
 *     <PwaUpdatePrompt />           [3J]
 *     <Routes>  …nine routes
 *     <BottomNav />
 */

import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef, type ReactElement } from 'react';
import { BottomNav } from './BottomNav.tsx';
import { BonusTimerBanner } from './features/bonus/index.ts';
import { expireCheck } from './features/bonus/expireCheck.ts';
import { PwaUpdatePrompt } from './PwaUpdatePrompt.tsx';
import { checkRetroactiveHygiene } from './features/habits/checkRetroactiveHygiene.ts';
import { useAppStore } from './state/store.ts';
import { DesktopShell } from './ui/parlour/index.ts';
import { RecentPulls } from './ui/parlour/RecentPulls.tsx';
import { useIsDesktop } from './lib/useIsDesktop.ts';
import { PachinkoPotMini, StreakMilestoneCelebration } from './features/jar/index.ts';
import { RailBonusWidget } from './features/bonus/RailBonusWidget.tsx';

// Lazy-load routes so the initial bundle stays lean. Each route ends up in
// its own chunk. The home chunk is small enough that eager is fine, but we
// lazy the rest for now — easy to un-lazy per route if it hurts Lighthouse.
const Home = lazy(() => import('./routes/Home.tsx'));
const Habits = lazy(() => import('./routes/Habits.tsx'));
const Rewards = lazy(() => import('./routes/Rewards.tsx'));
const Jar = lazy(() => import('./routes/Jar.tsx'));
const History = lazy(() => import('./routes/History.tsx'));
const Settings = lazy(() => import('./routes/Settings.tsx'));
const Onboarding = lazy(() => import('./routes/Onboarding.tsx'));
const SpinFlow = lazy(() => import('./routes/SpinFlow.tsx'));
const BonusTimerDetail = lazy(() => import('./routes/BonusTimerDetail.tsx'));

function RouteFallback() {
  return (
    <section className="route" aria-busy="true">
      <p className="route__subtitle">Loading…</p>
    </section>
  );
}

/**
 * Gate: on first run, all paths except `/onboarding` redirect to it.
 * Once `firstRunCompleted` flips true (the onboarding flow does this),
 * the gate steps out of the way. 3I owns the redirect policy.
 */
function FirstRunGate({ children }: { children: ReactElement }): ReactElement {
  const firstRunCompleted = useAppStore((s) => s.firstRunCompleted);
  const location = useLocation();
  if (!firstRunCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

export default function App() {
  // [3D] Wire `checkRetroactiveHygiene` once on mount (after store hydrate).
  // Guarded so StrictMode's double-effect doesn't double-award. The function
  // itself is idempotent (resets pendingHygieneBundle after processing), but
  // we keep the guard to avoid churn.
  const hygieneCheckedRef = useRef(false);
  useEffect(() => {
    if (hygieneCheckedRef.current) return;
    hygieneCheckedRef.current = true;
    try {
      checkRetroactiveHygiene();
    } catch {
      // Intentional swallow: boot-time hygiene reconciliation must not
      // break the app shell render.
    }
  }, []);

  // [3H] Expire-check: on-mount once, plus on every `visibilitychange` so
  // backgrounded tabs re-sync authoritatively against `endTimestamp`.
  // Idempotent: only timers whose `endTimestamp < now` flip.
  useEffect(() => {
    try {
      expireCheck();
    } catch {
      // Boot-time sweep must not crash the shell.
    }
    const onVisibility = () => {
      try {
        expireCheck();
      } catch {
        // Visibility-change sweep is best-effort.
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // [Desktop] At >=1024px the right rail surfaces the bonus widget, so the
  // sticky cross-route banner only mounts on mobile. Right-rail wiring lives
  // in Phase 2.4.
  const isDesktop = useIsDesktop();

  return (
    <div className="app-shell">
      {/* [3H] BonusTimerBanner — sticky across all routes; renders null when
          no active timers. Hidden at desktop (rail handles it). */}
      {!isDesktop && <BonusTimerBanner />}
      <PwaUpdatePrompt />
      <DesktopShell
        {...(isDesktop
          ? {
              rail: {
                bonus: <RailBonusWidget />,
                pot: <PachinkoPotMini />,
                recent: <RecentPulls />,
              },
            }
          : {})}
      >
      <main className="app-shell__main" id="main">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route
              path="/"
              element={
                <FirstRunGate>
                  <Home />
                </FirstRunGate>
              }
            />
            <Route
              path="/habits"
              element={
                <FirstRunGate>
                  <Habits />
                </FirstRunGate>
              }
            />
            <Route
              path="/rewards"
              element={
                <FirstRunGate>
                  <Rewards />
                </FirstRunGate>
              }
            />
            <Route
              path="/jar"
              element={
                <FirstRunGate>
                  <Jar />
                </FirstRunGate>
              }
            />
            <Route
              path="/history"
              element={
                <FirstRunGate>
                  <History />
                </FirstRunGate>
              }
            />
            <Route
              path="/settings"
              element={
                <FirstRunGate>
                  <Settings />
                </FirstRunGate>
              }
            />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route
              path="/spin/*"
              element={
                <FirstRunGate>
                  <SpinFlow />
                </FirstRunGate>
              }
            />
            <Route
              path="/bonus"
              element={
                <FirstRunGate>
                  <BonusTimerDetail />
                </FirstRunGate>
              }
            />
            {/* Catch-all sends to home rather than 404ing (HashRouter). */}
            <Route
              path="*"
              element={
                <FirstRunGate>
                  <Home />
                </FirstRunGate>
              }
            />
          </Routes>
        </Suspense>
      </main>
      </DesktopShell>
      <BottomNav />
      {/* Global -- shows whenever the daily streak hits a 100/1000-day
          milestone. Renders null when there's no pending celebration. */}
      <StreakMilestoneCelebration />
    </div>
  );
}
