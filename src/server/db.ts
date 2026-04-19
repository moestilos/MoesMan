import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL missing — set it in your environment or Vercel project settings.');
}

const sqlClient = neon(url);
export const db = drizzle(sqlClient, { schema });

export type {
  DbUser,
  DbUserInsert,
  DbLibraryEntry,
  DbFavorite,
  DbProgress,
  DbVisit,
} from './schema';

export function uuid(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

// ---------- Users ----------
export async function findUserById(id: string) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findUserByEmail(email: string) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function findUserByUsername(username: string) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
  return rows[0] ?? null;
}

export async function insertUser(data: {
  email: string;
  username: string;
  passwordHash: string;
}) {
  const rows = await db
    .insert(schema.users)
    .values({ id: uuid(), email: data.email, username: data.username, passwordHash: data.passwordHash })
    .returning();
  return rows[0];
}

export async function updateUserFields(
  id: string,
  data: Partial<{ email: string; username: string; passwordHash: string; avatarUrl: string | null }>,
) {
  const rows = await db.update(schema.users).set(data).where(eq(schema.users.id, id)).returning();
  return rows[0] ?? null;
}

export async function countUsers() {
  const rows = await db.select({ c: sql<number>`count(*)::int` }).from(schema.users);
  return rows[0]?.c ?? 0;
}

// ---------- Library ----------
export async function listLibraryByUser(userId: string) {
  return db
    .select()
    .from(schema.library)
    .where(eq(schema.library.userId, userId))
    .orderBy(desc(schema.library.addedAt));
}

export async function findLibraryEntry(userId: string, providerId: string, mangaId: string) {
  const rows = await db
    .select()
    .from(schema.library)
    .where(
      and(
        eq(schema.library.userId, userId),
        eq(schema.library.providerId, providerId),
        eq(schema.library.mangaId, mangaId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function addLibrary(data: {
  userId: string;
  providerId: string;
  mangaId: string;
  title: string;
  coverUrl: string | null;
}) {
  const rows = await db
    .insert(schema.library)
    .values({ id: uuid(), ...data })
    .onConflictDoNothing({
      target: [schema.library.userId, schema.library.providerId, schema.library.mangaId],
    })
    .returning();
  return rows[0] ?? (await findLibraryEntry(data.userId, data.providerId, data.mangaId));
}

export async function removeLibrary(userId: string, providerId: string, mangaId: string) {
  await db
    .delete(schema.library)
    .where(
      and(
        eq(schema.library.userId, userId),
        eq(schema.library.providerId, providerId),
        eq(schema.library.mangaId, mangaId),
      ),
    );
}

export async function listLibraryByManga(providerId: string, mangaId: string) {
  return db
    .select()
    .from(schema.library)
    .where(and(eq(schema.library.providerId, providerId), eq(schema.library.mangaId, mangaId)));
}

// ---------- Favorites ----------
export async function listFavoritesByUser(userId: string) {
  return db
    .select()
    .from(schema.favorites)
    .where(eq(schema.favorites.userId, userId))
    .orderBy(desc(schema.favorites.addedAt));
}

export async function isFavorite(userId: string, providerId: string, mangaId: string) {
  const rows = await db
    .select({ id: schema.favorites.id })
    .from(schema.favorites)
    .where(
      and(
        eq(schema.favorites.userId, userId),
        eq(schema.favorites.providerId, providerId),
        eq(schema.favorites.mangaId, mangaId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function toggleFavorite(userId: string, providerId: string, mangaId: string) {
  const existing = await isFavorite(userId, providerId, mangaId);
  if (existing) {
    await db
      .delete(schema.favorites)
      .where(
        and(
          eq(schema.favorites.userId, userId),
          eq(schema.favorites.providerId, providerId),
          eq(schema.favorites.mangaId, mangaId),
        ),
      );
    return false;
  }
  await db.insert(schema.favorites).values({ id: uuid(), userId, providerId, mangaId });
  return true;
}

export async function countFavoritesByManga(providerId: string, mangaId: string) {
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(schema.favorites)
    .where(and(eq(schema.favorites.providerId, providerId), eq(schema.favorites.mangaId, mangaId)));
  return rows[0]?.c ?? 0;
}

// ---------- Progress ----------
export async function findProgressByChapter(userId: string, chapterId: string) {
  const rows = await db
    .select()
    .from(schema.progress)
    .where(and(eq(schema.progress.userId, userId), eq(schema.progress.chapterId, chapterId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listProgressByManga(userId: string, providerId: string, mangaId: string) {
  return db
    .select()
    .from(schema.progress)
    .where(
      and(
        eq(schema.progress.userId, userId),
        eq(schema.progress.providerId, providerId),
        eq(schema.progress.mangaId, mangaId),
      ),
    )
    .orderBy(desc(schema.progress.updatedAt));
}

export async function listProgressHistory(userId: string, limit = 50) {
  return db
    .select()
    .from(schema.progress)
    .where(eq(schema.progress.userId, userId))
    .orderBy(desc(schema.progress.updatedAt))
    .limit(limit);
}

export async function upsertProgress(data: {
  userId: string;
  providerId: string;
  mangaId: string;
  mangaTitle?: string | null;
  mangaCoverUrl?: string | null;
  chapterId: string;
  chapterNumber?: string | null;
  page: number;
  totalPages?: number | null;
}) {
  const rows = await db
    .insert(schema.progress)
    .values({
      id: uuid(),
      userId: data.userId,
      providerId: data.providerId,
      mangaId: data.mangaId,
      mangaTitle: data.mangaTitle ?? null,
      mangaCoverUrl: data.mangaCoverUrl ?? null,
      chapterId: data.chapterId,
      chapterNumber: data.chapterNumber ?? null,
      page: data.page,
      totalPages: data.totalPages ?? null,
    })
    .onConflictDoUpdate({
      target: [schema.progress.userId, schema.progress.chapterId],
      set: {
        mangaTitle: data.mangaTitle ?? null,
        mangaCoverUrl: data.mangaCoverUrl ?? null,
        chapterNumber: data.chapterNumber ?? null,
        page: data.page,
        totalPages: data.totalPages ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return rows[0];
}

export async function deleteProgressByChapter(userId: string, providerId: string, chapterId: string) {
  await db
    .delete(schema.progress)
    .where(
      and(
        eq(schema.progress.userId, userId),
        eq(schema.progress.providerId, providerId),
        eq(schema.progress.chapterId, chapterId),
      ),
    );
}

export async function deleteAllProgress(userId: string) {
  await db.delete(schema.progress).where(eq(schema.progress.userId, userId));
}

export async function countProgressByManga(providerId: string, mangaId: string) {
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(schema.progress)
    .where(and(eq(schema.progress.providerId, providerId), eq(schema.progress.mangaId, mangaId)));
  return rows[0]?.c ?? 0;
}

export async function countDistinctReadersByManga(providerId: string, mangaId: string) {
  const rows = await db
    .select({ c: sql<number>`count(distinct ${schema.progress.userId})::int` })
    .from(schema.progress)
    .where(and(eq(schema.progress.providerId, providerId), eq(schema.progress.mangaId, mangaId)));
  return rows[0]?.c ?? 0;
}

// ---------- Visits ----------
export async function trackVisit(data: { ip: string; path: string; userAgent?: string; day: string }) {
  await db
    .insert(schema.visits)
    .values({
      id: uuid(),
      ip: data.ip,
      path: data.path,
      userAgent: data.userAgent ?? null,
      day: data.day,
    })
    .onConflictDoNothing({ target: [schema.visits.ip, schema.visits.day] });
}

export async function listVisitsRecent(days: number) {
  const cutoff = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  return db.select().from(schema.visits).where(gte(schema.visits.day, cutoff));
}

export async function listAllVisits() {
  return db.select().from(schema.visits);
}

// ---------- Admin aggregations ----------
export async function listMangasAggregated(opts: { q?: string; limit?: number }) {
  const limit = opts.limit ?? 50;
  const q = opts.q?.trim().toLowerCase();

  // Agrupar desde library
  const rows = await db.execute<{
    provider_id: string;
    manga_id: string;
    title: string;
    cover_url: string | null;
    library_count: number;
    favorites_count: number;
    readers_count: number;
    progress_count: number;
  }>(sql`
    select
      l.provider_id, l.manga_id,
      (array_agg(l.title order by l.added_at desc))[1] as title,
      (array_agg(l.cover_url order by l.added_at desc))[1] as cover_url,
      count(distinct l.user_id)::int as library_count,
      (select count(*)::int from favorites f where f.provider_id = l.provider_id and f.manga_id = l.manga_id) as favorites_count,
      (select count(distinct user_id)::int from progress p where p.provider_id = l.provider_id and p.manga_id = l.manga_id) as readers_count,
      (select count(*)::int from progress p2 where p2.provider_id = l.provider_id and p2.manga_id = l.manga_id) as progress_count
    from library l
    ${q ? sql`where lower(l.title) like ${'%' + q + '%'}` : sql``}
    group by l.provider_id, l.manga_id
    order by library_count desc
    limit ${limit}
  `);
  return rows.rows ?? rows;
}
