import type { APIRoute } from 'astro';
import { getProvider } from '@/lib/providers';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get('q') ?? '').trim();
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0));
  const providerId = url.searchParams.get('provider') ?? 'mangadex';

  if (!q) {
    return new Response(JSON.stringify({ data: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const provider = getProvider(providerId);
    const data = await provider.search({ query: q, limit, offset });
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
