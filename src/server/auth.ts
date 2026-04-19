import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import type { APIContext } from 'astro';
import { commit, getDb, nowIso, uuid, type DbUser } from './db';

const SECRET_RAW =
  process.env.JWT_SECRET ??
  'moesman-dev-secret-please-set-JWT_SECRET-in-production';
const SECRET = new TextEncoder().encode(SECRET_RAW);
const EXPIRES = process.env.JWT_EXPIRES_IN ?? '7d';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
}

export async function signToken(user: DbUser): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(EXPIRES)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.sub) return null;
    const db = await getDb();
    const u = db.users.find((x) => x.id === payload.sub);
    if (!u) return null;
    return { id: u.id, email: u.email, username: u.username, avatarUrl: u.avatarUrl ?? null };
  } catch {
    return null;
  }
}

export function extractBearer(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function requireUser(ctx: APIContext): Promise<AuthUser | Response> {
  const token = extractBearer(ctx.request);
  if (!token) return jsonError(401, 'Missing token');
  const user = await verifyToken(token);
  if (!user) return jsonError(401, 'Invalid token');
  return user;
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

export function jsonError(status: number, message: string): Response {
  return json({ message }, { status });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

export async function registerUser(input: {
  email: string;
  username: string;
  password: string;
}): Promise<{ user: AuthUser; token: string } | { error: string; status: number }> {
  const email = String(input.email ?? '').trim().toLowerCase();
  const username = String(input.username ?? '').trim();
  const password = String(input.password ?? '');

  if (!EMAIL_RE.test(email)) return { error: 'Email inválido', status: 400 };
  if (!USERNAME_RE.test(username)) return { error: 'Usuario inválido (3-32, a-z 0-9 _.-)', status: 400 };
  if (password.length < 8) return { error: 'Contraseña mínima 8 caracteres', status: 400 };

  const db = await getDb();
  if (db.users.some((u) => u.email === email)) return { error: 'Email ya registrado', status: 409 };
  if (db.users.some((u) => u.username === username)) return { error: 'Usuario ya en uso', status: 409 };

  const passwordHash = await bcrypt.hash(password, 10);
  const user: DbUser = {
    id: uuid(),
    email,
    username,
    passwordHash,
    createdAt: nowIso(),
  };
  db.users.push(user);
  await commit();
  const token = await signToken(user);
  return {
    user: { id: user.id, email: user.email, username: user.username, avatarUrl: user.avatarUrl ?? null },
    token,
  };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ user: AuthUser; token: string } | { error: string; status: number }> {
  const email = String(input.email ?? '').trim().toLowerCase();
  const password = String(input.password ?? '');
  const db = await getDb();
  const user = db.users.find((u) => u.email === email);
  if (!user) return { error: 'Credenciales inválidas', status: 401 };
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: 'Credenciales inválidas', status: 401 };
  const token = await signToken(user);
  return {
    user: { id: user.id, email: user.email, username: user.username, avatarUrl: user.avatarUrl ?? null },
    token,
  };
}
