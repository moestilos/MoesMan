import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getToken, isAuthed } from '@/lib/auth-client';

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
      alert((e as Error).message);
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
      alert((e as Error).message);
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
        {inLibrary === null ? '…' : inLibrary ? '✓ En biblioteca' : '＋ Añadir a biblioteca'}
      </button>
      <button
        type="button"
        onClick={toggleFavorite}
        disabled={busy || favorite === null}
        aria-pressed={!!favorite}
        className="btn-ghost"
        title={favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
      >
        {favorite ? '★ Favorito' : '☆ Favorito'}
      </button>
    </div>
  );
}
