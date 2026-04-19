import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    email: varchar('email', { length: 255 }).notNull(),
    username: varchar('username', { length: 64 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex('users_email_unique').on(t.email),
    usernameUnique: uniqueIndex('users_username_unique').on(t.username),
  }),
);

export const libraryEntries = pgTable(
  'library_entries',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: varchar('provider_id', { length: 32 }).notNull(),
    mangaId: varchar('manga_id', { length: 128 }).notNull(),
    title: varchar('title', { length: 512 }).notNull(),
    coverUrl: text('cover_url'),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userMangaUnique: uniqueIndex('library_user_manga_unique').on(
      t.userId,
      t.providerId,
      t.mangaId,
    ),
    userIdx: index('library_user_idx').on(t.userId),
  }),
);

export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: varchar('provider_id', { length: 32 }).notNull(),
    mangaId: varchar('manga_id', { length: 128 }).notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userMangaUnique: uniqueIndex('favorites_user_manga_unique').on(
      t.userId,
      t.providerId,
      t.mangaId,
    ),
  }),
);

export const readingProgress = pgTable(
  'reading_progress',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: varchar('provider_id', { length: 32 }).notNull(),
    mangaId: varchar('manga_id', { length: 128 }).notNull(),
    chapterId: varchar('chapter_id', { length: 128 }).notNull(),
    chapterNumber: varchar('chapter_number', { length: 32 }),
    page: integer('page').notNull().default(0),
    totalPages: integer('total_pages'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userChapterUnique: uniqueIndex('progress_user_chapter_unique').on(
      t.userId,
      t.providerId,
      t.chapterId,
    ),
    userMangaIdx: index('progress_user_manga_idx').on(t.userId, t.mangaId),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type LibraryEntry = typeof libraryEntries.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type ReadingProgressRow = typeof readingProgress.$inferSelect;
