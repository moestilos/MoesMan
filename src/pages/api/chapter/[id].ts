import type { APIRoute } from 'astro';
import { getProvider } from '@/lib/providers';

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
  const { id } = params;
  const providerId = url.searchParams.get('provider') ?? 'mangadex';
  if (!id) return new Response('Missing id', { status: 400 });

  try {
    const provider = getProvider(providerId);
    const data = await provider.getChapterPages(id);
    return new Response(JSON.stringify({ data }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
