import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa-install-dismissed') === '1');

  useEffect(() => {
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  useEffect(() => {
    const handler = () => setVisible(false);
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setInstallEvent(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', '1');
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-portal-surface border border-portal-border rounded-lg shadow-xl p-4 flex items-start gap-3">
        <img
          src="/pwa-192x192.png"
          alt=""
          className="w-10 h-10 rounded-lg flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-portal-text-primary">Install ProH Pharmacy</p>
          <p className="text-xs text-portal-text-muted mt-0.5">
            Add to your home screen for faster access and offline use.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleInstall}
              className="px-3 py-1.5 bg-primary-green hover:bg-deep-green text-white text-xs font-semibold rounded cursor-pointer transition"
            >
              Install
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 text-portal-text-muted hover:text-portal-text-primary text-xs font-semibold rounded cursor-pointer transition"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-portal-text-muted hover:text-portal-text-primary flex-shrink-0 -mt-0.5 cursor-pointer"
          aria-label="Dismiss"
        >
          <i className="pi pi-times text-xs" />
        </button>
      </div>
    </div>
  );
}
