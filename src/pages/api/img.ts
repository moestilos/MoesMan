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
    const headers: Record<string, string> = {
      'User-Agent': 'MoesMan/0.1 (personal manga library)',
      Accept: 'image/*',
    };
    if (ref && REFERERS[ref]) headers.Referer = REFERERS[ref];
    const upstream = await fetch(target, { headers });
    if (!upstream.ok || !upstream.body) {
      return new Response('Upstream error', { status: upstream.status || 502 });
    }
    const headers = new Headers();
    const ct = upstream.headers.get('content-type');
    if (ct) headers.set('Content-Type', ct);
    const cl = upstream.headers.get('content-length');
    if (cl) headers.set('Content-Length', cl);
    headers.set('Cache-Control', 'public, max-age=604800, immutable');
    headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    return new Response(upstream.body, { status: 200, headers });
  } catch (e) {
    return new Response('Fetch failed', { status: 502 });
  }
};
