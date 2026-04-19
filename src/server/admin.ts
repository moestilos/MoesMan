import type { AuthUser } from './auth';

export const ADMIN_EMAIL = 'gmateosoficial@gmail.com';

export function isAdmin(user: AuthUser | null | undefined): boolean {
  return user?.email?.toLowerCase() === ADMIN_EMAIL;
}

export function extractIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  return 'unknown';
}
