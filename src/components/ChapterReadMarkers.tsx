import { useEffect } from 'react';
import { api } from '@/lib/api';
import { getToken, isAuthed } from '@/lib/auth-client';

interface Props {
  providerId: string;
  mangaId: string;
}

/**
 * Decorador DOM: tras mount, consulta progreso del usuario para este manga
 * y marca los <li data-chapter-id="X"> como leídos / en progreso.
 * No renderiza nada visible — actúa sobre el árbol existente.
 */
export default function ChapterReadMarkers({ providerId, mangaId }: Props) {
  useEffect(() => {
    if (!isAuthed() || !mangaId) return;
    const token = getToken();
    if (!token) return;

    let cancelled = false;
    api.progress
      .forManga(token, providerId, mangaId)
      .then((rows) => {
        if (cancelled) return;
        for (const p of rows) {
          const el = document.querySelector<HTMLLIElement>(
            `li[data-chapter-id="${CSS.escape(p.chapterId)}"]`,
          );
          if (!el) continue;
          const pct =
            p.totalPages && p.totalPages > 0
              ? Math.min(100, Math.round(((p.page + 1) / p.totalPages) * 100))
              : null;
          const done = pct !== null && pct >= 98;
          el.dataset.readState = done ? 'done' : 'partial';
          el.classList.add('chapter-marked');
          if (done) el.classList.add('chapter-done');
          else el.classList.add('chapter-partial');

          // Insertar badge en el .chapter-meta si existe
          const meta = el.querySelector<HTMLElement>('[data-chapter-meta]');
          if (meta && !meta.querySelector('[data-chapter-read-badge]')) {
            const badge = document.createElement('span');
            badge.dataset.chapterReadBadge = '';
            badge.className = done
              ? 'inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/30'
              : 'inline-flex items-center gap-1 rounded-md bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-300 ring-1 ring-brand-500/30';
            badge.innerHTML = done
              ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="m9 16.17-4.17-4.17L3.41 13.41 9 19l12-12-1.41-1.41z"/></svg>Leído'
              : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/></svg>${pct}%`;
            meta.prepend(badge);
          }

          // Barra de progreso parcial al pie del bloque de texto
          if (!done && pct !== null) {
            const progHost = el.querySelector<HTMLElement>('[data-chapter-progress-host]');
            if (progHost && !progHost.querySelector('[data-chapter-progress-bar]')) {
              const bar = document.createElement('div');
              bar.dataset.chapterProgressBar = '';
              bar.className = 'mt-1.5 h-0.5 w-full max-w-[160px] overflow-hidden rounded-full bg-border';
              const fill = document.createElement('div');
              fill.className = 'h-full bg-gradient-to-r from-brand-400 to-brand-600';
              fill.style.width = `${pct}%`;
              bar.appendChild(fill);
              progHost.appendChild(bar);
            }
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [providerId, mangaId]);

  return null;
}
