import type { APIRoute } from 'astro';
import { getProvider } from '@/lib/providers';

export const prerender = false;

/**
 * Devuelve las URLs de páginas de un capítulo con cache-bust en el servidor.
 * Útil cuando el cliente detecta que las páginas del SSR están muertas y
 * necesita un nuevo servidor MangaDex@Home.
 */
export const GET: APIRoute = async ({ params, url }) => {
  const chapterId = params.chapterId;
  if (!chapterId) return new Response('Missing id', { status: 400 });
  const providerId = (url.searchParams.get('p') ?? 'mangadex').toLowerCase();

  try {
    const resolved = providerId === 'webtoons' ? 'webtoons' : providerId === 'comick' ? 'comick' : 'mangadex';
    const provider = getProvider(resolved);
    // Solo MangaDex soporta forceFresh para repedir at-home server
    const data =
      resolved === 'mangadex'
        ? await (provider as import('@/lib/providers/mangadex').MangaDexProvider).getChapterPages(chapterId, true)
        : await provider.getChapterPages(chapterId);
    return new Response(JSON.stringify({ pages: data.pages }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
