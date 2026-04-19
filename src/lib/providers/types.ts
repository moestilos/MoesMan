export type Language = 'es' | 'es-la' | 'en' | string;

export interface MangaSummary {
  id: string;
  providerId: string;
  title: string;
  coverUrl: string | null;
  year?: number | null;
  status?: 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | 'unknown';
  contentRating?: 'safe' | 'suggestive' | 'erotica' | 'pornographic' | 'unknown';
  tags?: string[];
  score?: number | null;
  originalLanguage?: string;
}

export interface MangaDetail extends MangaSummary {
  description: string;
  altTitles: string[];
  authors: string[];
  artists: string[];
  originalLanguage?: string;
  availableLanguages?: string[];
}

export interface Chapter {
  id: string;
  providerId: string;
  mangaId: string;
  number: string | null;
  volume: string | null;
  title: string | null;
  language: Language;
  publishedAt: string | null;
  pages: number | null;
  groupName?: string | null;
}

export interface ChapterPages {
  chapterId: string;
  providerId: string;
  pages: string[];
}

export type ContentRating = 'safe' | 'suggestive' | 'erotica' | 'pornographic';

export interface SearchParams {
  query: string;
  limit?: number;
  offset?: number;
  language?: Language[];
  contentRating?: ContentRating[];
}

export interface BrowseParams {
  limit?: number;
  offset?: number;
  contentRating?: ContentRating[];
  tagIds?: string[];
  demographic?: 'shounen' | 'shoujo' | 'seinen' | 'josei';
  order?: 'popular' | 'latest' | 'relevance';
  originalLanguage?: string[];
  /** Override de availableTranslatedLanguage. Si no se pasa usa preferredLanguages. */
  language?: string[];
}

export interface ChaptersParams {
  mangaId: string;
  limit?: number;
  offset?: number;
  language?: Language[];
  order?: 'asc' | 'desc';
}

export interface MangaProvider {
  readonly id: string;
  readonly name: string;
  readonly preferredLanguages: Language[];

  search(params: SearchParams): Promise<MangaSummary[]>;
  popular(params?: BrowseParams): Promise<MangaSummary[]>;
  latest(params?: BrowseParams): Promise<MangaSummary[]>;
  browse(params: BrowseParams): Promise<MangaSummary[]>;
  getManga(id: string): Promise<MangaDetail>;
  listChapters(params: ChaptersParams): Promise<Chapter[]>;
  getChapterPages(chapterId: string): Promise<ChapterPages>;
}

export class ProviderError extends Error {
  constructor(public providerId: string, message: string, public status?: number) {
    super(`[${providerId}] ${message}`);
    this.name = 'ProviderError';
  }
}
