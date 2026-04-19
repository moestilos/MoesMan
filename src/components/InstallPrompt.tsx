import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'moesman:pwa-dismissed';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBefore as EventListener);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore as EventListener);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar MoesMan"
      className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 animate-slide-up rounded-2xl bg-bg-card p-4 ring-1 ring-border shadow-card backdrop-blur"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-black text-white shadow-glow">
          M
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Instala MoesMan</div>
          <div className="text-xs text-fg-muted">
            Añádela a tu pantalla de inicio para acceso rápido y lectura offline.
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={install} className="btn-primary flex-1">Instalar</button>
        <button onClick={dismiss} className="btn-ghost">Ahora no</button>
      </div>
    </div>
  );
}
