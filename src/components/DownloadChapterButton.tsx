import { useEffect, useState } from 'react';
import { showAlert } from '@/lib/dialog';

interface Props {
  chapterId: string;
  chapterNumber: string | null;
  label?: string;
  compact?: boolean;
}

type State = 'idle' | 'fetching' | 'caching' | 'done' | 'error';

const keyDone = (id: string) => `moesman:downloaded:${id}`;

export default function DownloadChapterButton({ chapterId, chapterNumber, label, compact }: Props) {
  const [state, setState] = useState<State>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(keyDone(chapterId))) setAlreadyDone(true);
  }, [chapterId]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.chapterId !== chapterId) return;
      if (d.type === 'PRECACHE_PROGRESS') {
        setProgress({ done: d.done, total: d.total });
        setState('caching');
      } else if (d.type === 'PRECACHE_DONE') {
        setState('done');
        localStorage.setItem(keyDone(chapterId), String(d.total));
        setAlreadyDone(true);
        setTimeout(() => setState('idle'), 2500);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [chapterId]);

  async function download(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (state !== 'idle') return;
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      showAlert({
        title: 'Descarga offline no disponible',
        message: 'Para guardar capítulos sin conexión necesitas acceder por HTTPS o ejecutar la app en local con el Service Worker activo.',
      });
      return;
    }
    setState('fetching');
    try {
      const res = await fetch(`/api/chapter/${chapterId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const urls: string[] = body?.data?.pages ?? [];
      if (urls.length === 0) throw new Error('Sin páginas');
      navigator.serviceWorker.controller.postMessage({
        type: 'PRECACHE_CHAPTER',
        chapterId,
        urls,
      });
    } catch (err) {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
    }
  }

  const isBusy = state === 'fetching' || state === 'caching';
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const showLabel = label ?? (compact ? '' : alreadyDone ? 'Descargado' : 'Descargar');

  return (
    <button
      type="button"
      onClick={download}
      disabled={isBusy}
      aria-label={`Descargar capítulo ${chapterNumber ?? ''}`}
      className={`relative inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition ring-1 ring-inset ${
        alreadyDone
          ? 'bg-emerald-600/20 text-emerald-300 ring-emerald-500/40'
          : 'bg-bg-hover text-fg-muted ring-border hover:text-fg hover:ring-brand-500/40'
      } ${isBusy ? 'cursor-wait' : ''}`}
    >
      {state === 'idle' && !alreadyDone && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      )}
      {alreadyDone && state === 'idle' && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
      {isBusy && (
        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" d="M21 12a9 9 0 1 1-6.22-8.56" />
        </svg>
      )}
      {state === 'caching' && progress.total > 0 ? `${pct}%` : showLabel}
      {state === 'error' && <span className="text-rose-300">Error</span>}
    </button>
  );
}
