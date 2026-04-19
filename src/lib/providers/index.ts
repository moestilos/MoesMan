import type {
  Chapter,
  MangaProvider,
  MangaSummary,
} from './types';
import { MangaDexProvider } from './mangadex';
import { ComickProvider } from './comick';

const providers = new Map<string, MangaProvider>();

function register(p: MangaProvider) {
  providers.set(p.id, p);
}

register(new MangaDexProvider());
register(new ComickProvider());

export function getProvider(id = 'mangadex'): MangaProvider {
  const p = providers.get(id);
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}

export function listProviders(): MangaProvider[] {
  return [...providers.values()];
}

/** Normaliza título para matching cross-provider */
function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

/** Dedupe mangas cross-provider por título normalizado. Mantiene el primero (prioridad del orden). */
export function dedupeMangas(list: MangaSummary[]): MangaSummary[] {
  const seen = new Map<string, MangaSummary>();
  for (const m of list) {
    const k = normalizeTitle(m.title);
    if (!k) continue;
    if (!seen.has(k)) seen.set(k, m);
  }
  return [...seen.values()];
}

/**
 * Merge cross-provider chapters: prefiere primero (por orden de providers),
 * completa huecos con caps de otros providers cuando el primero no los tenga.
 */
export function mergeChaptersAcrossProviders(
  primary: Chapter[],
  fallback: Chapter[],
): Chapter[] {
  const seen = new Set(primary.map((c) => c.number ?? `_v${c.volume ?? '?'}_${c.id}`));
  const extra = fallback.filter((c) => {
    const k = c.number ?? `_v${c.volume ?? '?'}_${c.id}`;
    return !seen.has(k);
  });
  return [...primary, ...extra].sort((a, b) => {
    const na = a.number === null ? Infinity : parseFloat(a.number);
    const nb = b.number === null ? Infinity : parseFloat(b.number);
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
  });
}

export * from './types';
