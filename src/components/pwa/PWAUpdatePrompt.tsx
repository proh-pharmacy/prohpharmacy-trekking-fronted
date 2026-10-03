import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWAUpdatePrompt() {
  const [visible, setVisible] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) setRegistration(r);
    },
  });

  useEffect(() => {
    if (needRefresh) setVisible(true);
  }, [needRefresh]);

  // Check for a new worker on an hourly timer, when the app returns to the
  // foreground, and when the network comes back. Field devices spend long
  // stretches backgrounded or offline, so a once-per-session check is not
  // enough — users must see the "Reload & update" prompt to receive new
  // precached assets like the Ghana Card detector.
  useEffect(() => {
    if (!registration) return;
    const check = () => { void registration.update(); };
    const timer = window.setInterval(check, 60 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      check();
      if (needRefresh) setVisible(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', check);
    };
  }, [registration, needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[3000] w-72">
      <div className="bg-portal-surface border border-portal-border rounded-lg shadow-xl p-4 flex items-start gap-3 text-white">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-green/10 flex items-center justify-center">
          <i className="pi pi-refresh text-primary-green text-sm" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Update available</p>
          <p className="text-xs text-white mt-0.5">
            A new version of ProH Pharmacy is ready.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleUpdate}
              className="px-3 py-1.5 bg-primary-green hover:bg-deep-green text-white text-xs font-semibold rounded cursor-pointer transition"
            >
              Reload & update
            </button>
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="px-3 py-1.5 text-white hover:text-portal-text text-xs font-semibold rounded cursor-pointer transition"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
