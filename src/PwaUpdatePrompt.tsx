/**
 * PwaUpdatePrompt — listens for a waiting service worker and surfaces a
 * sticky toast with a Reload action (3J).
 *
 * Per DECISIONS.md Q10/Q13 and ARCHITECTURE §9.1 we use
 * `registerType: 'prompt'` in the Vite PWA plugin + `useRegisterSW` here.
 *
 * The toast stays until the user taps Reload — we do NOT auto-reload and
 * we do NOT allow a plain dismiss (per brief: "non-dismissable-until-acted-on").
 */

import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from './ui/toast-context.ts';

export function PwaUpdatePrompt() {
  const { toast } = useToast();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // We do NOT auto-skip waiting. User must tap Reload.
    immediate: true,
  });

  useEffect(() => {
    if (!needRefresh) return;
    toast({
      title: 'New version available',
      description: 'Reload to get the latest update.',
      politeness: 'assertive',
      action: {
        label: 'Reload',
        onClick: () => {
          setNeedRefresh(false);
          void updateServiceWorker(true);
        },
      },
    });
  }, [needRefresh, setNeedRefresh, updateServiceWorker, toast]);

  return null;
}
