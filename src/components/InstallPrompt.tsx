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
      className="fixed left-4 top-4 z-50 hidden animate-fade-in md:block"
    >
      <button
        type="button"
        onClick={install}
        className="group inline-flex items-center gap-2 rounded-full bg-bg-card/90 pl-2 pr-3.5 py-1.5 text-xs font-medium text-fg-muted ring-1 ring-border backdrop-blur transition hover:text-fg hover:ring-brand-500/50 hover:shadow-glow"
        title="Instalar MoesMan como app"
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </span>
        <span>Instalar app</span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          role="button"
          aria-label="Ocultar aviso"
          className="ml-1 text-fg-subtle hover:text-fg cursor-pointer"
        >
          ×
        </span>
      </button>
    </div>
  );
}
