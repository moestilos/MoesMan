import type { APIRoute } from 'astro';

export const prerender = false;
// Vercel Edge: cold start ~ms, streaming nativo, mejor para imágenes
export const config = { runtime: 'edge' };

const ALLOWED = [
  /^https:\/\/uploads\.mangadex\.org\//,
  /^https:\/\/[a-z0-9-]+\.mangadex\.network\//,
  /^https:\/\/mangadex\.org\//,
  /^https:\/\/meo\d*\.comick\.pictures\//,
  /^https:\/\/[a-z0-9-]+\.pstatic\.net\//,
  /^https:\/\/shared-comic\.pstatic\.net\//,
];

const REFERERS: Record<string, string> = {
  w: 'https://www.webtoons.com/',
};

function decodeB64Url(s: string): string {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return atob(b64);
}

export const GET: APIRoute = async ({ params, url }) => {
  const b64 = params.b64;
  if (!b64) return new Response('Missing', { status: 400 });
  let target: string;
  try {
    target = decodeURIComponent(escape(decodeB64Url(b64)));
  } catch {
    return new Response('Bad token', { status: 400 });
  }
  const ref = url.searchParams.get('r');

  if (!ALLOWED.some((r) => r.test(target))) {
    return new Response('Domain not allowed', { status: 400 });
  }

  try {
    const reqHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 MoesMan/0.1',
      Accept: 'image/*',
    };
    if (ref && REFERERS[ref]) reqHeaders.Referer = REFERERS[ref];
    // Timeout agresivo: fallar rápido permite al cliente re-pedir servidor fresco
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 8_000);
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
