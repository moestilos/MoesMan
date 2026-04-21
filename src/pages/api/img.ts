import type { APIRoute } from 'astro';

export const prerender = false;

const ALLOWED = [
  /^https:\/\/uploads\.mangadex\.org\//,
  /^https:\/\/[a-z0-9-]+\.mangadex\.network\//,
  /^https:\/\/mangadex\.org\//,
  /^https:\/\/meo\d*\.comick\.pictures\//,
  /^https:\/\/[a-z0-9-]+\.pstatic\.net\//,
  /^https:\/\/shared-comic\.pstatic\.net\//,
];

const REFERERS: Record<string, string> = {
  webtoons: 'https://www.webtoons.com/',
};

export const GET: APIRoute = async ({ url }) => {
  const target = url.searchParams.get('u');
  const ref = url.searchParams.get('ref');
  if (!target) return new Response('Missing u', { status: 400 });

  if (!ALLOWED.some((r) => r.test(target))) {
    return new Response('Domain not allowed', { status: 400 });
  }

  try {
    const reqHeaders: Record<string, string> = {
      'User-Agent': 'MoesMan/0.1 (personal manga library)',
      Accept: 'image/*',
    };
    if (ref && REFERERS[ref]) reqHeaders.Referer = REFERERS[ref];
    // Timeout 25s: evita servidores MangaDex@Home caídos que cuelgan el stream
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 25_000);
    let upstream: Response;
    try {
      upstream = await fetch(target, { headers: reqHeaders, signal: ac.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!upstream.ok || !upstream.body) {
      return new Response('Upstream error', { status: upstream.status || 502 });
    }
    const resHeaders = new Headers();
    const ct = upstream.headers.get('content-type');
    if (ct) resHeaders.set('Content-Type', ct);
    const cl = upstream.headers.get('content-length');
    if (cl) resHeaders.set('Content-Length', cl);
    resHeaders.set('Cache-Control', 'public, max-age=604800, immutable');
    resHeaders.set('Cross-Origin-Resource-Policy', 'same-origin');
    return new Response(upstream.body, { status: 200, headers: resHeaders });
  } catch {
    return new Response('Fetch failed', { status: 502 });
  }
};
