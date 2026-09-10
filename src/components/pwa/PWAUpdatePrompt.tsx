import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWAUpdatePrompt() {
  const [visible, setVisible] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every 60 minutes
      if (r) {
        setInterval(() => r.update(), 60 * 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (needRefresh) setVisible(true);
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72">
      <div className="bg-portal-surface border border-portal-border rounded-lg shadow-xl p-4 flex items-start gap-3">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-green/10 flex items-center justify-center">
          <i className="pi pi-refresh text-primary-green text-sm" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-portal-text-primary">Update available</p>
          <p className="text-xs text-portal-text-muted mt-0.5">
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
              className="px-3 py-1.5 text-portal-text-muted hover:text-portal-text-primary text-xs font-semibold rounded cursor-pointer transition"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
