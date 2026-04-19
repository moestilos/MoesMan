import { useState } from 'react';
import { downloadChapterZip, type ZipProgress } from '@/lib/zip-download';

interface Props {
  mangaTitle: string;
  chapterId: string;
  chapterNumber: string | null;
  chapterTitle: string | null;
  compact?: boolean;
}

export default function DownloadChapterZip({
  mangaTitle,
  chapterId,
  chapterNumber,
  chapterTitle,
  compact,
}: Props) {
  const [progress, setProgress] = useState<ZipProgress | null>(null);
  const busy = progress && progress.phase !== 'done' && progress.phase !== 'error';

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    try {
      await downloadChapterZip(
        mangaTitle,
        { id: chapterId, number: chapterNumber, title: chapterTitle },
        setProgress,
      );
      setTimeout(() => setProgress(null), 2000);
    } catch {
      setTimeout(() => setProgress(null), 3000);
    }
  }

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  const label = (() => {
    if (!progress) return compact ? '' : 'ZIP';
    if (progress.phase === 'fetching-pages') return '…';
    if (progress.phase === 'downloading') return `${pct}%`;
    if (progress.phase === 'zipping') return 'ZIP';
    if (progress.phase === 'done') return '✓';
    if (progress.phase === 'error') return 'Err';
    return '';
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!busy}
      aria-label={`Descargar ZIP capitulo ${chapterNumber ?? ''}`}
      title="Descargar como ZIP"
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition ring-1 ring-inset ${
        progress?.phase === 'done'
          ? 'bg-emerald-600/20 text-emerald-300 ring-emerald-500/40'
          : progress?.phase === 'error'
            ? 'bg-rose-600/20 text-rose-300 ring-rose-500/40'
            : 'bg-bg-hover text-fg-muted ring-border hover:text-fg hover:ring-brand-500/40'
      } ${busy ? 'cursor-wait' : ''}`}
    >
      {busy ? (
        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" d="M21 12a9 9 0 1 1-6.22-8.56" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      )}
      {label}
    </button>
  );
}
