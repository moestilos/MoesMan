import type { MangaProvider } from './types';
import { MangaDexProvider } from './mangadex';

const providers = new Map<string, MangaProvider>();

function register(p: MangaProvider) {
  providers.set(p.id, p);
}

register(new MangaDexProvider());

export function getProvider(id = 'mangadex'): MangaProvider {
  const p = providers.get(id);
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}

export function listProviders(): MangaProvider[] {
  return [...providers.values()];
}

export * from './types';
