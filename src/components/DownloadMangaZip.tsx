import { useState } from 'react';
import { downloadMangaZip, type ZipProgress, type ChapterMeta } from '@/lib/zip-download';
import { showConfirm } from '@/lib/dialog';

interface Props {
  mangaTitle: string;
  chapters: ChapterMeta[];
}

export default function DownloadMangaZip({ mangaTitle, chapters }: Props) {
  const [progress, setProgress] = useState<ZipProgress | null>(null);
  const busy = progress && progress.phase !== 'done' && progress.phase !== 'error';

  async function onClick() {
    if (busy) return;
    if (chapters.length === 0) return;
    const ok = await showConfirm({
      title: 'Descargar manga completo',
      message: `¿Descargar ${chapters.length} capítulos como ZIP único? Puede tardar varios minutos y consumir memoria del dispositivo.`,
      confirmText: 'Descargar',
      tone: 'brand',
    });
    if (!ok) return;
    try {
      await downloadMangaZip(mangaTitle, chapters, setProgress);
      setTimeout(() => setProgress(null), 3000);
    } catch {
      setTimeout(() => setProgress(null), 4000);
    }
  }

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  const label = (() => {
    if (!progress) return 'Descargar manga';
    if (progress.phase === 'fetching-pages') {
      return `Catalogando ${progress.current}/${progress.total}`;
    }
    if (progress.phase === 'downloading') return `Descargando ${pct}%`;
    if (progress.phase === 'zipping') return 'Empaquetando ZIP…';
    if (progress.phase === 'done') return 'Descargado ✓';
    if (progress.phase === 'error') return progress.message ?? 'Error';
    return '';
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!busy || chapters.length === 0}
      className={`btn-secondary ${busy ? 'cursor-wait' : ''}`}
      title={`Descargar ${chapters.length} capítulos`}
    >
      {busy ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" d="M21 12a9 9 0 1 1-6.22-8.56" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
}
