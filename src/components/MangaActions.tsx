import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getToken, isAuthed } from '@/lib/auth-client';
import { showAlert } from '@/lib/dialog';

interface Props {
  providerId: string;
  mangaId: string;
  title: string;
  coverUrl: string | null;
}

export default function MangaActions({ providerId, mangaId, title, coverUrl }: Props) {
  const [inLibrary, setInLibrary] = useState<boolean | null>(null);
  const [favorite, setFavorite] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAuthed()) {
      setInLibrary(false);
      setFavorite(false);
      return;
    }
    const token = getToken()!;
    api.library.has(token, providerId, mangaId).then((r) => setInLibrary(r.has)).catch(() => setInLibrary(false));
    api.favorites
      .list(token)
      .then((list) => setFavorite(list.some((f) => f.providerId === providerId && f.mangaId === mangaId)))
      .catch(() => setFavorite(false));
  }, [providerId, mangaId]);

  async function toggleLibrary() {
    if (!isAuthed()) {
      window.location.href = `/login?next=/manga/${mangaId}`;
      return;
    }
    const token = getToken()!;
    setBusy(true);
    try {
      if (inLibrary) {
        await api.library.remove(token, providerId, mangaId);
        setInLibrary(false);
      } else {
        await api.library.add(token, { providerId, mangaId, title, coverUrl });
        setInLibrary(true);
      }
    } catch (e) {
      showAlert({ title: 'Error', message: (e as Error).message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  async function toggleFavorite() {
    if (!isAuthed()) {
      window.location.href = `/login?next=/manga/${mangaId}`;
      return;
    }
    const token = getToken()!;
    setBusy(true);
    try {
      const r = await api.favorites.toggle(token, providerId, mangaId);
      setFavorite(r.favorite);
    } catch (e) {
      showAlert({ title: 'Error', message: (e as Error).message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={toggleLibrary}
        disabled={busy || inLibrary === null}
        className={inLibrary ? 'btn-ghost' : 'btn-ghost ring-brand-500/40 text-brand-300'}
      >
        {inLibrary === null ? (
          <span className="h-4 w-4 animate-pulse rounded-full bg-current opacity-40" />
        ) : inLibrary ? (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>En biblioteca</span>
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Añadir a biblioteca</span>
          </>
        )}
      </button>
      <button
        type="button"
        onClick={toggleFavorite}
        disabled={busy || favorite === null}
        aria-pressed={!!favorite}
        className="btn-ghost"
        title={favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill={favorite ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={favorite ? 'text-amber-400' : ''}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        <span>{favorite ? 'Favorito' : 'Añadir favorito'}</span>
      </button>
    </div>
  );
}
