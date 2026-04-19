import {
  type Chapter,
  type ChapterPages,
  type ChaptersParams,
  type Language,
  type MangaDetail,
  type MangaProvider,
  type MangaSummary,
  type SearchParams,
  ProviderError,
} from './types';
import { cached } from '../cache';
import { translateTag } from './tag-names';

const API = 'https://api.mangadex.org';
const COVERS = 'https://uploads.mangadex.org/covers';
const USER_AGENT = 'MoesMan/0.1 (personal manga library)';
const DEFAULT_RATINGS: import('./types').ContentRating[] = ['safe', 'suggestive', 'erotica'];

function proxy(url: string): string {
  return `/api/img?u=${encodeURIComponent(url)}`;
}

type MDRelationship = {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
};

type MDManga = {
  id: string;
  type: 'manga';
  attributes: {
    title: Record<string, string>;
    altTitles: Array<Record<string, string>>;
    description: Record<string, string>;
    year?: number | null;
    status?: string;
    contentRating?: string;
    originalLanguage?: string;
    availableTranslatedLanguages?: string[];
    tags: Array<{
      id: string;
      attributes: { name: Record<string, string> };
    }>;
  };
  relationships: MDRelationship[];
};

type MDChapter = {
  id: string;
  type: 'chapter';
  attributes: {
    volume: string | null;
    chapter: string | null;
    title: string | null;
    translatedLanguage: string;
    pages: number;
    publishAt: string | null;
    readableAt: string | null;
    externalUrl: string | null;
  };
  relationships: MDRelationship[];
};

async function mdFetch<T>(path: string, params?: Record<string, string | string[] | number>): Promise<T> {
  const url = new URL(API + path);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(k, String(item)));
      else if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new ProviderError('mangadex', `HTTP ${res.status} on ${path}`, res.status);
  }
  return (await res.json()) as T;
}

function pickLocalized(map: Record<string, string> | undefined, langs: string[]): string {
  if (!map) return '';
  for (const l of langs) if (map[l]) return map[l];
  const first = Object.values(map).find(Boolean);
  return first ?? '';
}

function findCoverFilename(rels: MDRelationship[]): string | null {
  const cover = rels.find((r) => r.type === 'cover_art');
  const file = (cover?.attributes as { fileName?: string } | undefined)?.fileName;
  return file ?? null;
}

function mapSummary(m: MDManga, langs: string[]): MangaSummary {
  const coverFile = findCoverFilename(m.relationships);
  return {
    id: m.id,
    providerId: 'mangadex',
    title: pickLocalized(m.attributes.title, [...langs, 'en', 'ja-ro', 'ja']),
    coverUrl: coverFile ? proxy(`${COVERS}/${m.id}/${coverFile}.512.jpg`) : null,
    year: m.attributes.year ?? null,
    status: (m.attributes.status as MangaSummary['status']) ?? 'unknown',
    contentRating: (m.attributes.contentRating as MangaSummary['contentRating']) ?? 'unknown',
    tags: m.attributes.tags
      .map((t) => {
        const raw = pickLocalized(t.attributes.name, ['en']);
        return raw ? translateTag(raw) : '';
      })
      .filter(Boolean),
  };
}

function mapDetail(m: MDManga, langs: string[]): MangaDetail {
  const base = mapSummary(m, langs);
  const authors = m.relationships
    .filter((r) => r.type === 'author')
    .map((r) => (r.attributes as { name?: string } | undefined)?.name ?? '')
    .filter(Boolean);
  const artists = m.relationships
    .filter((r) => r.type === 'artist')
    .map((r) => (r.attributes as { name?: string } | undefined)?.name ?? '')
    .filter(Boolean);
  return {
    ...base,
    description: pickLocalized(m.attributes.description, [...langs, 'en']),
    altTitles: m.attributes.altTitles
      .map((t) => pickLocalized(t, [...langs, 'en']))
      .filter(Boolean),
    authors,
    artists,
    originalLanguage: m.attributes.originalLanguage,
    availableLanguages: m.attributes.availableTranslatedLanguages ?? [],
  };
}

function mapChapter(c: MDChapter): Chapter {
  const group = c.relationships.find((r) => r.type === 'scanlation_group');
  return {
    id: c.id,
    providerId: 'mangadex',
    mangaId: c.relationships.find((r) => r.type === 'manga')?.id ?? '',
    number: c.attributes.chapter,
    volume: c.attributes.volume,
    title: c.attributes.title,
    language: c.attributes.translatedLanguage,
    publishedAt: c.attributes.publishAt,
    pages: c.attributes.pages,
    groupName: (group?.attributes as { name?: string } | undefined)?.name ?? null,
  };
}

export class MangaDexProvider implements MangaProvider {
  readonly id = 'mangadex';
  readonly name = 'MangaDex';
  readonly preferredLanguages: Language[] = ['es', 'es-la'];

  async search({ query, limit = 24, offset = 0, language, contentRating }: SearchParams): Promise<MangaSummary[]> {
    const langs = language ?? this.preferredLanguages;
    const ratings = contentRating ?? DEFAULT_RATINGS;
    const key = `md:search:${query}:${limit}:${offset}:${langs.join(',')}:${ratings.join(',')}`;
    return cached(key, 60_000, async () => {
      const data = await mdFetch<{ data: MDManga[] }>('/manga', {
        title: query,
        limit,
        offset,
        'includes[]': ['cover_art', 'author', 'artist'],
        'availableTranslatedLanguage[]': langs,
        'contentRating[]': ratings,
        'order[relevance]': 'desc',
      });
      return data.data.map((m) => mapSummary(m, langs));
    });
  }

  async popular({ limit = 24, offset = 0, contentRating }: import('./types').BrowseParams = {}): Promise<MangaSummary[]> {
    const langs = this.preferredLanguages;
    const ratings = contentRating ?? DEFAULT_RATINGS;
    const key = `md:popular:${limit}:${offset}:${langs.join(',')}:${ratings.join(',')}`;
    return cached(key, 5 * 60_000, async () => {
      const data = await mdFetch<{ data: MDManga[] }>('/manga', {
        limit,
        offset,
        'includes[]': ['cover_art', 'author', 'artist'],
        'availableTranslatedLanguage[]': langs,
        'contentRating[]': ratings,
        hasAvailableChapters: 'true',
        'order[followedCount]': 'desc',
      });
      return data.data.map((m) => mapSummary(m, langs));
    });
  }

  async latest({ limit = 24, offset = 0, contentRating }: import('./types').BrowseParams = {}): Promise<MangaSummary[]> {
    const langs = this.preferredLanguages;
    const ratings = contentRating ?? DEFAULT_RATINGS;
    const key = `md:latest:${limit}:${offset}:${langs.join(',')}:${ratings.join(',')}`;
    return cached(key, 2 * 60_000, async () => {
      const data = await mdFetch<{ data: MDManga[] }>('/manga', {
        limit,
        offset,
        'includes[]': ['cover_art', 'author', 'artist'],
        'availableTranslatedLanguage[]': langs,
        'contentRating[]': ratings,
        hasAvailableChapters: 'true',
        'order[latestUploadedChapter]': 'desc',
      });
      return data.data.map((m) => mapSummary(m, langs));
    });
  }

  async getManga(id: string): Promise<MangaDetail> {
    const langs = this.preferredLanguages;
    return cached(`md:manga:${id}`, 5 * 60_000, async () => {
      const data = await mdFetch<{ data: MDManga }>(`/manga/${id}`, {
        'includes[]': ['cover_art', 'author', 'artist'],
      });
      return mapDetail(data.data, langs);
    });
  }

  async listChapters({
    mangaId,
    limit = 100,
    offset = 0,
    language,
    order = 'asc',
  }: ChaptersParams): Promise<Chapter[]> {
    const langs = language ?? this.preferredLanguages;
    const key = `md:chapters:${mangaId}:${limit}:${offset}:${langs.join(',')}:${order}`;
    return cached(key, 60_000, async () => {
      const data = await mdFetch<{ data: MDChapter[] }>(`/manga/${mangaId}/feed`, {
        limit,
        offset,
        'translatedLanguage[]': langs,
        'order[volume]': order,
        'order[chapter]': order,
        'includes[]': ['scanlation_group'],
        'contentRating[]': ['safe', 'suggestive', 'erotica'],
        includeExternalUrl: '0',
      });
      return data.data
        .map(mapChapter)
        .filter((c) => c.pages && c.pages > 0);
    });
  }

  async getChapterPages(chapterId: string): Promise<ChapterPages> {
    return cached(`md:pages:${chapterId}`, 5 * 60_000, async () => {
      const data = await mdFetch<{
        baseUrl: string;
        chapter: { hash: string; data: string[]; dataSaver: string[] };
      }>(`/at-home/server/${chapterId}`);
      const pages = data.chapter.data.map(
        (file) => proxy(`${data.baseUrl}/data/${data.chapter.hash}/${file}`),
      );
      return { chapterId, providerId: 'mangadex', pages };
    });
  }
}
