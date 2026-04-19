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

export interface SearchParams {
  query: string;
  limit?: number;
  offset?: number;
  language?: Language[];
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
