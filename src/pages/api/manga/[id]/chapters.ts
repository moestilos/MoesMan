import type { APIRoute } from 'astro';
import { getProvider } from '@/lib/providers';

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
  const { id } = params;
  const providerId = url.searchParams.get('provider') ?? 'mangadex';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 300), 500);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const order = (url.searchParams.get('order') ?? 'asc') as 'asc' | 'desc';

  if (!id) return new Response('Missing id', { status: 400 });

  try {
    const provider = getProvider(providerId);
    const data = await provider.listChapters({ mangaId: id, limit, offset, order });
    return new Response(JSON.stringify({ data }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
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
