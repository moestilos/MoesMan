/**
 * ComicK provider — API pública https://api.comick.fun
 * Complemento a MangaDex: contenido ES que MangaDex no tiene.
 * Zero scraping, endpoints JSON estables.
 */
import {
  type Chapter,
  type ChapterPages,
  type ChaptersParams,
  type Language,
  type MangaDetail,
  type MangaProvider,
  type MangaSummary,
  type SearchParams,
  type BrowseParams,
  ProviderError,
} from './types';
import { cached } from '../cache';
import { translateTag } from './tag-names';

const API = 'https://api.comick.fun';
const UA = 'MoesMan/0.1';
const PAGE_BASE = 'https://meo3.comick.pictures';

interface CKSearchItem {
  id: number;
  hid: string;
  slug: string;
  title: string;
  md_titles?: Array<{ title: string }>;
  country?: string;
  md_covers?: Array<{ w?: number; h?: number; b2key?: string }>;
  rating?: string;
  year?: number;
  status?: number; // 1 ongoing, 2 completed, 3 cancelled, 4 hiatus
  content_rating?: 'safe' | 'suggestive' | 'erotica';
  last_chapter?: number;
  genres?: number[];
}

interface CKChapter {
  id: number;
  hid: string;
  chap: string | null;
  title: string | null;
  vol: string | null;
  lang: string;
  created_at: string;
  group_name?: string[];
  last_at?: string;
}

interface CKComic {
  hid: string;
  slug: string;
  title: string;
  md_titles?: Array<{ title: string; lang?: string }>;
  desc?: string;
  md_covers?: Array<{ b2key?: string }>;
  country?: string;
  year?: number;
  status?: number;
  content_rating?: string;
  md_comic_md_genres?: Array<{ md_genres: { name: string } }>;
  authors?: Array<{ name: string }>;
  artists?: Array<{ name: string }>;
}

function statusOf(s?: number): MangaSummary['status'] {
  return s === 2 ? 'completed' : s === 3 ? 'cancelled' : s === 4 ? 'hiatus' : s === 1 ? 'ongoing' : 'unknown';
}

import { proxyUrl } from './proxy';
function proxy(url: string): string {
  return proxyUrl(url);
}

function coverUrl(item: { md_covers?: Array<{ b2key?: string }> }): string | null {
  const k = item.md_covers?.[0]?.b2key;
  return k ? proxy(`${PAGE_BASE}/${k}`) : null;
}

async function ckFetch<T>(path: string, params?: Record<string, string | string[] | number>): Promise<T> {
  const url = new URL(API + path);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k, String(x)));
      else url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (!res.ok) throw new ProviderError('comick', `HTTP ${res.status} on ${path}`, res.status);
  return (await res.json()) as T;
}

function mapSummary(x: CKSearchItem): MangaSummary {
  const latinTitle =
    x.md_titles?.find((t) => /^[\x00-\x7F\u00C0-\u024F\u1E00-\u1EFF]+$/.test(t.title))?.title ?? x.title;
  return {
    id: x.hid,
    providerId: 'comick',
    title: latinTitle,
    coverUrl: coverUrl(x),
    year: x.year ?? null,
    status: statusOf(x.status),
    contentRating: (x.content_rating as MangaSummary['contentRating']) ?? 'unknown',
    tags: [],
    originalLanguage: x.country,
  };
}

function mapDetail(c: CKComic): MangaDetail {
  const langs = ['es', 'es-la'];
  let title = c.title;
  for (const l of langs) {
    const h = c.md_titles?.find((t) => t.lang === l);
    if (h?.title) { title = h.title; break; }
  }
  const alt = (c.md_titles ?? [])
    .filter((t) => t.title && t.title !== title)
    .map((t) => t.title);

  return {
    id: c.hid,
    providerId: 'comick',
    title,
    coverUrl: coverUrl(c),
    year: c.year ?? null,
    status: statusOf(c.status),
    contentRating: (c.content_rating as MangaDetail['contentRating']) ?? 'unknown',
    description: c.desc ?? '',
    altTitles: alt,
    authors: (c.authors ?? []).map((a) => a.name),
    artists: (c.artists ?? []).map((a) => a.name),
    tags: (c.md_comic_md_genres ?? []).map((g) => translateTag(g.md_genres.name)),
    originalLanguage: c.country ?? undefined,
    availableLanguages: ['es'],
  };
}

function mapChapter(c: CKChapter, mangaId: string): Chapter {
  return {
    id: c.hid,
    providerId: 'comick',
    mangaId,
    number: c.chap,
    volume: c.vol,
    title: c.title,
    language: c.lang,
    publishedAt: c.created_at,
    pages: null,
    groupName: c.group_name?.[0] ?? null,
  };
}

export class ComickProvider implements MangaProvider {
  readonly id = 'comick';
  readonly name = 'ComicK';
  readonly preferredLanguages: Language[] = ['es', 'es-la', 'en'];

  async search({ query, limit = 24 }: SearchParams): Promise<MangaSummary[]> {
    if (!query) return [];
    return cached(`ck:search:${query}:${limit}`, 60_000, async () => {
      const data = await ckFetch<CKSearchItem[]>('/v1.0/search', {
        q: query,
        limit,
        page: 1,
        tachiyomi: 'true',
      });
      return data.map(mapSummary);
    });
  }

  async popular({ limit = 24, offset = 0 }: BrowseParams = {}): Promise<MangaSummary[]> {
    const page = Math.floor(offset / limit) + 1;
    return cached(`ck:popular:${limit}:${page}`, 5 * 60_000, async () => {
      const data = await ckFetch<CKSearchItem[]>('/v1.0/search', {
        limit,
        page,
        sort: 'follow',
        tachiyomi: 'true',
        completed: 'false',
      });
      return data.map(mapSummary);
    });
  }

  async latest({ limit = 24, offset = 0 }: BrowseParams = {}): Promise<MangaSummary[]> {
    const page = Math.floor(offset / limit) + 1;
    return cached(`ck:latest:${limit}:${page}`, 2 * 60_000, async () => {
      const data = await ckFetch<CKSearchItem[]>('/v1.0/search', {
        limit,
        page,
        sort: 'uploaded',
        tachiyomi: 'true',
      });
      return data.map(mapSummary);
    });
  }

  async browse(params: BrowseParams): Promise<MangaSummary[]> {
    // Comick no indexa por tagIds MangaDex. Fallback a popular.
    return this.popular({ limit: params.limit, offset: params.offset });
  }

  async getManga(hid: string): Promise<MangaDetail> {
    return cached(`ck:manga:${hid}`, 5 * 60_000, async () => {
      const data = await ckFetch<{ comic: CKComic }>(`/comic/${hid}`);
      return mapDetail(data.comic);
    });
  }

  async listChapters({ mangaId, limit = 200, language }: ChaptersParams): Promise<Chapter[]> {
    const langs = language ?? this.preferredLanguages;
    const key = `ck:chapters:${mangaId}:${langs.join(',')}:${limit}`;
    return cached(key, 60_000, async () => {
      // ComicK permite 1 lang por call. Hacer calls paralelos y concatenar.
      const baseLangs = langs.map((l) => (l === 'es-la' ? 'es' : l)); // ComicK usa 'es' para ambos
      const unique = [...new Set(baseLangs)];
      const results = await Promise.all(
        unique.map((lang) =>
          ckFetch<{ chapters: CKChapter[] }>(`/comic/${mangaId}/chapters`, { lang, limit }).catch(
            () => ({ chapters: [] as CKChapter[] }),
          ),
        ),
      );
      const all = results.flatMap((r) => r.chapters);
      return all.map((c) => mapChapter(c, mangaId));
    });
  }

  async getChapterPages(chapterId: string): Promise<ChapterPages> {
    return cached(`ck:pages:${chapterId}`, 5 * 60_000, async () => {
      const data = await ckFetch<{ chapter: { md_images: Array<{ b2key: string }> } }>(
        `/chapter/${chapterId}`,
        { tachiyomi: 'true' },
      );
      const pages = (data.chapter.md_images ?? []).map((img) => proxy(`${PAGE_BASE}/${img.b2key}`));
      return { chapterId, providerId: 'comick', pages };
    });
  }
}
