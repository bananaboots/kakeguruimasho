/**
 * InstallPromptScreen — step 5: add-to-home (3I).
 *
 * iOS: no `beforeinstallprompt` support; show Safari Share → Add to
 * Home Screen instructions with the `Share` lucide icon.
 *
 * Android / desktop Chromium: capture `beforeinstallprompt` at step
 * mount (or earlier from document-load — callers may pre-capture) and
 * call `prompt()` on the user's tap. We listen here for robustness.
 *
 * A "Finish" button completes onboarding regardless.
 */

import { useEffect, useState, type ReactElement } from 'react';
import { Share } from 'lucide-react';
import { Button } from '../../ui/button.tsx';

/**
 * Minimal type for the event — not in lib.dom.d.ts by default.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export interface InstallPromptScreenProps {
  onFinish: () => void;
  onBack: () => void;
  /** Injected in tests. */
  userAgent?: string;
}

function detectIOS(ua: string): boolean {
  // iPad on iPadOS 13+ reports Mac; include MaxTouchPoints check via DOM.
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (/Macintosh/.test(ua) && typeof navigator !== 'undefined') {
    // iPad masquerading as Mac.
    const n = navigator as Navigator & { maxTouchPoints?: number };
    if ((n.maxTouchPoints ?? 0) > 1) return true;
  }
  return false;
}

export function InstallPromptScreen({
  onFinish,
  onBack,
  userAgent,
}: InstallPromptScreenProps): ReactElement {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const isIOS = detectIOS(ua);

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isIOS) return;
    const handler = (e: Event): void => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const installedHandler = (): void => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return (): void => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [isIOS]);

  const handleInstall = async (): Promise<void> => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      // User cancelled or browser threw — treat as a no-op.
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="onboarding__step" data-testid="install-prompt-screen">
      <p className="onboarding__eyebrow">One more thing</p>
      <h1 className="onboarding__title">Put it on your home screen.</h1>
      <p className="onboarding__body">
        Visibility is half the magic. This app works best as an icon
        you tap — not a tab you forget.
      </p>

      {isIOS ? (
        <ol className="onboarding__install-steps" aria-label="iOS install steps">
          <li className="onboarding__install-step">
            Tap the{' '}
            <span className="onboarding__install-icon" aria-hidden="true">
              <Share size={18} strokeWidth={2} />
            </span>{' '}
            <span>Share button</span> at the bottom of Safari.
          </li>
          <li className="onboarding__install-step">
            Scroll and pick <strong>Add to Home Screen</strong>.
          </li>
          <li className="onboarding__install-step">
            Confirm the name and tap <strong>Add</strong>.
          </li>
        </ol>
      ) : installed ? (
        <p className="onboarding__body">
          Installed. You can close this tab and launch from your home
          screen any time.
        </p>
      ) : deferredPrompt ? (
        <>
          <p className="onboarding__body">
            Tap Install to add the app to your device.
          </p>
          <Button variant="primary" size="lg" onClick={handleInstall}>
            Install app
          </Button>
        </>
      ) : (
        <p className="onboarding__body">
          Your browser will show an install prompt when it's ready. You
          can also add this tab to your home screen from the browser
          menu.
        </p>
      )}

      <div className="onboarding__nav">
        <Button variant="ghost" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" size="lg" onClick={onFinish}>
          Finish
        </Button>
      </div>
    </div>
  );
}
