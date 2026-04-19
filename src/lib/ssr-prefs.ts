import type { ContentRating } from './providers/types';

export function readNsfwCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(/(?:^|;\s*)moesman_nsfw=([^;]+)/);
  return match?.[1] === '1';
}

export function contentRatingsFor(nsfw: boolean): ContentRating[] {
  return nsfw
    ? ['safe', 'suggestive', 'erotica', 'pornographic']
    : ['safe', 'suggestive', 'erotica'];
}
