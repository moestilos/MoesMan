import type { APIRoute } from 'astro';
import { trackVisit } from '@/server/db';
import { extractIp } from '@/server/admin';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: { path?: string } = {};
  try {
    body = (await request.json()) as { path?: string };
  } catch {
    return new Response(null, { status: 204 });
  }
  const path = (body.path ?? '/').slice(0, 200);
  const ip = extractIp(request);
  const ua = request.headers.get('user-agent')?.slice(0, 200) ?? '';
  const day = new Date().toISOString().slice(0, 10);

  try {
    await trackVisit({ ip, path, userAgent: ua, day });
  } catch {
    // swallow — tracking no debe romper respuesta
  }
  return new Response(null, { status: 204 });
};
