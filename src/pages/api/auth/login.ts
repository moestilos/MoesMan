import type { APIRoute } from 'astro';
import { loginUser, json, jsonError } from '@/server/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }
  const result = await loginUser({
    email: String(body.email ?? ''),
    password: String(body.password ?? ''),
  });
  if ('error' in result) return jsonError(result.status, result.error);
  return json(result);
};
