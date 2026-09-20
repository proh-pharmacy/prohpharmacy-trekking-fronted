import { useEffect, useState } from 'react';

function readStandaloneState(): boolean {
  if (typeof window === 'undefined') return false;
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mediaStandalone || iosStandalone;
}

/** True when the app is running from an installed PWA window. */
export function useIsPWA(): boolean {
  const [isPWA, setIsPWA] = useState(readStandaloneState);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const update = () => setIsPWA(readStandaloneState());
    mediaQuery?.addEventListener?.('change', update);
    window.addEventListener('appinstalled', update);
    return () => {
      mediaQuery?.removeEventListener?.('change', update);
      window.removeEventListener('appinstalled', update);
    };
  }, []);

  return isPWA;
}

