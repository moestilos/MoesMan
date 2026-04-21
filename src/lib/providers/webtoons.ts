/**
 * Webtoons provider — endpoints públicos de webtoons.com (Naver/LINE).
 * Catálogo oficial manhwa SFW. Parsing HTML ligero con regex.
 *
 * ID compuesto: `${titleNo}|${genre}|${slug}` — encoded para caber en URL.
 * Chapter ID: `${titleNo}|${genre}|${slug}|${episodeNo}|${epSlug}`
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

const ORIGIN = 'https://www.webtoons.com';
const UA = 'Mozilla/5.0 (compatible; MoesMan/0.1)';

function proxy(url: string): string {
  return `/api/img?u=${encodeURIComponent(url)}&ref=webtoons`;
}

function encodeMangaId(titleNo: string, genre: string, slug: string): string {
  return `${titleNo}|${genre}|${slug}`;
}
function decodeMangaId(id: string): { titleNo: string; genre: string; slug: string } | null {
  const [titleNo, genre, slug] = id.split('|');
  if (!titleNo || !genre || !slug) return null;
  return { titleNo, genre, slug };
}

function encodeChapterId(parts: { titleNo: string; genre: string; slug: string; episodeNo: string; epSlug: string }): string {
  return `${parts.titleNo}|${parts.genre}|${parts.slug}|${parts.episodeNo}|${parts.epSlug}`;
}
function decodeChapterId(id: string): { titleNo: string; genre: string; slug: string; episodeNo: string; epSlug: string } | null {
  const [titleNo, genre, slug, episodeNo, epSlug] = id.split('|');
  if (!titleNo || !episodeNo) return null;
  return { titleNo, genre: genre ?? '', slug: slug ?? '', episodeNo, epSlug: epSlug ?? 'ep' };
}

async function wtFetch(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      Referer: ORIGIN + '/',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new ProviderError('webtoons', `HTTP ${res.status} on ${url}`, res.status);
  return res.text();
}

function matchAll(html: string, re: RegExp): RegExpMatchArray[] {
  const results: RegExpMatchArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) results.push(m);
  return results;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/** Extrae series de páginas tipo "search" o "dailySchedule". */
function parseSeriesList(html: string): MangaSummary[] {
  const re = /href="(https:\/\/www\.webtoons\.com\/en\/([^/]+)\/([^/]+)\/list\?title_no=(\d+))"[^>]*>([\s\S]*?)<\/a>/g;
  const out: MangaSummary[] = [];
  const seen = new Set<string>();
  for (const m of matchAll(html, re)) {
    const [, , genre, slug, titleNo, inner] = m;
    if (seen.has(titleNo)) continue;
    seen.add(titleNo);
    const titleMatch = /<(?:p|span)[^>]*class="[^"]*subj[^"]*"[^>]*>([\s\S]*?)<\/(?:p|span)>/.exec(inner);
    const title = titleMatch ? decodeHtml(titleMatch[1].replace(/<[^>]+>/g, '')).trim() : decodeHtml(slug.replace(/-/g, ' '));
    const imgMatch = /<img[^>]+src="(https:\/\/[^"]+)"/.exec(inner);
    out.push({
      id: encodeMangaId(titleNo, genre, slug),
      providerId: 'webtoons',
      title,
      coverUrl: imgMatch ? proxy(imgMatch[1]) : null,
      year: null,
      status: 'unknown',
      contentRating: 'safe',
      tags: [genre],
      originalLanguage: 'ko',
    });
  }
  return out;
}

function parseDetail(html: string, id: string): MangaDetail {
  const decoded = decodeMangaId(id);
  const ogTitle = /<meta property="og:title" content="([^"]+)"/.exec(html);
  const ogDesc = /<meta property="og:description" content="([^"]+)"/.exec(html);
  const ogImg = /<meta property="og:image" content="(https:\/\/[^"]+)"/.exec(html);
  const authorMatch = /<a[^>]*class="author"[^>]*>([\s\S]*?)<\/a>/.exec(html)
    ?? /<span[^>]*class="author"[^>]*>([\s\S]*?)<\/span>/.exec(html);
  const author = authorMatch ? decodeHtml(authorMatch[1].replace(/<[^>]+>/g, '')).trim() : '';
  return {
    id,
    providerId: 'webtoons',
    title: ogTitle ? decodeHtml(ogTitle[1]).trim() : decoded?.slug.replace(/-/g, ' ') ?? 'Sin título',
    coverUrl: ogImg ? proxy(ogImg[1]) : null,
    year: null,
    status: 'ongoing',
    contentRating: 'safe',
    description: ogDesc ? decodeHtml(ogDesc[1]).trim() : '',
    altTitles: [],
    authors: author ? [author] : [],
    artists: [],
    tags: decoded ? [decoded.genre] : [],
    originalLanguage: 'ko',
    availableLanguages: ['en'],
  };
}

function parseEpisodes(html: string, decoded: NonNullable<ReturnType<typeof decodeMangaId>>): Chapter[] {
  // Buscar bloques <li ... id="_episodeItem_K" data-episode-no="K"> con href viewer
  const re = /<li[^>]*id="_episodeItem_\d+"[^>]*data-episode-no="(\d+)"[\s\S]*?<a[^>]+href="([^"]+)"[\s\S]*?<span[^>]*class="subj"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="date"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/li>/g;
  const out: Chapter[] = [];
  for (const m of matchAll(html, re)) {
    const [, episodeNo, href, subj, dateRaw] = m;
    const epSlugMatch = /\/([^/]+)\/viewer\?/.exec(href);
    const epSlug = epSlugMatch ? epSlugMatch[1] : 'ep';
    const title = decodeHtml(subj.replace(/<[^>]+>/g, '')).trim();
    const dateStr = decodeHtml(dateRaw.replace(/<[^>]+>/g, '')).trim();
    const publishedAt = dateStr ? new Date(dateStr).toISOString() : null;
    out.push({
      id: encodeChapterId({ ...decoded, episodeNo, epSlug }),
      providerId: 'webtoons',
      mangaId: encodeMangaId(decoded.titleNo, decoded.genre, decoded.slug),
      number: episodeNo,
      volume: null,
      title: title || null,
      language: 'en',
      publishedAt,
      pages: null,
      groupName: 'Webtoons',
    });
  }
  return out;
}

export class WebtoonsProvider implements MangaProvider {
  readonly id = 'webtoons';
  readonly name = 'Webtoons';
  readonly preferredLanguages: Language[] = ['en'];

  async search({ query, limit = 24 }: SearchParams): Promise<MangaSummary[]> {
    if (!query) return [];
    return cached(`wt:search:${query}:${limit}`, 5 * 60_000, async () => {
      const html = await wtFetch(`${ORIGIN}/search?keyword=${encodeURIComponent(query)}`);
      return parseSeriesList(html).slice(0, limit);
    });
  }

  async popular({ limit = 24 }: BrowseParams = {}): Promise<MangaSummary[]> {
    return cached(`wt:popular:${limit}`, 30 * 60_000, async () => {
      const html = await wtFetch(`${ORIGIN}/en/originals`);
      return parseSeriesList(html).slice(0, limit);
    });
  }

  async latest({ limit = 24 }: BrowseParams = {}): Promise<MangaSummary[]> {
    return cached(`wt:latest:${limit}`, 10 * 60_000, async () => {
      const html = await wtFetch(`${ORIGIN}/en/dailySchedule`);
      return parseSeriesList(html).slice(0, limit);
    });
  }

  async browse(params: BrowseParams): Promise<MangaSummary[]> {
    return this.popular({ limit: params.limit });
  }

  async getManga(id: string): Promise<MangaDetail> {
    const d = decodeMangaId(id);
    if (!d) throw new ProviderError('webtoons', `Bad manga id: ${id}`, 400);
    return cached(`wt:manga:${id}`, 10 * 60_000, async () => {
      const html = await wtFetch(`${ORIGIN}/en/${d.genre}/${d.slug}/list?title_no=${d.titleNo}`);
      return parseDetail(html, id);
    });
  }

  async listChapters({ mangaId }: ChaptersParams): Promise<Chapter[]> {
    const d = decodeMangaId(mangaId);
    if (!d) return [];
    return cached(`wt:chapters:${mangaId}`, 5 * 60_000, async () => {
      // Webtoons lista 10 por pagina. Paginar hasta vacío (max 50 pags = 500 caps).
      const all: Chapter[] = [];
      for (let page = 1; page <= 50; page++) {
        const html = await wtFetch(
          `${ORIGIN}/en/${d.genre}/${d.slug}/list?title_no=${d.titleNo}&page=${page}`,
        );
        const batch = parseEpisodes(html, d);
        if (batch.length === 0) break;
        // Dedupe por episodeNo porque Webtoons repite entre pags a veces
        const newOnes = batch.filter((c) => !all.some((x) => x.number === c.number));
        if (newOnes.length === 0) break;
        all.push(...newOnes);
      }
      // Orden ascendente
      all.sort((a, b) => parseInt(a.number ?? '0') - parseInt(b.number ?? '0'));
      return all;
    });
  }

  async getChapterPages(chapterId: string): Promise<ChapterPages> {
    const d = decodeChapterId(chapterId);
    if (!d) throw new ProviderError('webtoons', `Bad chapter id: ${chapterId}`, 400);
    return cached(`wt:pages:${chapterId}`, 10 * 60_000, async () => {
      const html = await wtFetch(
        `${ORIGIN}/en/${d.genre}/${d.slug}/${d.epSlug}/viewer?title_no=${d.titleNo}&episode_no=${d.episodeNo}`,
      );
      const pages = matchAll(html, /data-url="(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/gi)
        .map((m) => proxy(m[1]));
      return { chapterId, providerId: 'webtoons', pages };
    });
  }
}
