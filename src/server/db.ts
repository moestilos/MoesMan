/**
 * Embedded JSON DB. Zero-config: guarda en ./data/moesman.json.
 * Para producción real → migrar a SQLite/Postgres (NestJS ya existe).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface DbUser {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface DbLibraryEntry {
  id: string;
  userId: string;
  providerId: string;
  mangaId: string;
  title: string;
  coverUrl: string | null;
  addedAt: string;
}

export interface DbFavorite {
  id: string;
  userId: string;
  providerId: string;
  mangaId: string;
  addedAt: string;
}

export interface DbProgress {
  id: string;
  userId: string;
  providerId: string;
  mangaId: string;
  chapterId: string;
  chapterNumber: string | null;
  page: number;
  totalPages: number | null;
  updatedAt: string;
}

export interface DbVisit {
  id: string;
  ip: string;
  path: string;
  userAgent?: string;
  day: string; // YYYY-MM-DD
  createdAt: string;
}

interface DbShape {
  users: DbUser[];
  library: DbLibraryEntry[];
  favorites: DbFavorite[];
  progress: DbProgress[];
  visits: DbVisit[];
}

const DEFAULT_DATA_FILE = join(process.cwd(), 'data', 'moesman.json');
const FILE = process.env.MOESMAN_DB_FILE ?? DEFAULT_DATA_FILE;

let cache: DbShape | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function load(): Promise<DbShape> {
  if (cache) return cache;
  if (!existsSync(FILE)) {
    const empty: DbShape = { users: [], library: [], favorites: [], progress: [], visits: [] };
    await mkdir(dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(empty, null, 2), 'utf8');
    cache = empty;
    return empty;
  }
  const raw = await readFile(FILE, 'utf8');
  const parsed = JSON.parse(raw) as Partial<DbShape>;
  cache = {
    users: parsed.users ?? [],
    library: parsed.library ?? [],
    favorites: parsed.favorites ?? [],
    progress: parsed.progress ?? [],
    visits: parsed.visits ?? [],
  };
  return cache;
}

async function persist() {
  if (!cache) return;
  const snapshot = JSON.stringify(cache, null, 2);
  // serialize writes para evitar corrupción
  writeQueue = writeQueue.then(() => writeFile(FILE, snapshot, 'utf8'));
  await writeQueue;
}

export async function getDb(): Promise<DbShape> {
  return load();
}

export async function commit() {
  await persist();
}

export function uuid(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
