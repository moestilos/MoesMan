import type { APIRoute } from 'astro';
import { getProvider } from '@/lib/providers';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const providerId = url.searchParams.get('provider') ?? 'mangadex';
  const type = url.searchParams.get('type') ?? 'popular';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 12), 50);

  try {
    const provider = getProvider(providerId);
    const fn = type === 'latest' ? provider.latest : provider.popular;
    const data = await fn.call(provider, { limit });
    return new Response(JSON.stringify({ data }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600, s-maxage=1800',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error';
    return new Response(JSON.stringify({ error: msg, data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
