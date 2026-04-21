import { pgTable, text, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailUq: uniqueIndex('users_email_uq').on(t.email),
    usernameUq: uniqueIndex('users_username_uq').on(t.username),
  }),
);

export const library = pgTable(
  'library',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    providerId: text('provider_id').notNull(),
    mangaId: text('manga_id').notNull(),
    title: text('title').notNull(),
    coverUrl: text('cover_url'),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userMangaUq: uniqueIndex('library_user_manga_uq').on(t.userId, t.providerId, t.mangaId),
    userIdx: index('library_user_idx').on(t.userId),
    mangaIdx: index('library_manga_idx').on(t.providerId, t.mangaId),
  }),
);

export const favorites = pgTable(
  'favorites',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    providerId: text('provider_id').notNull(),
    mangaId: text('manga_id').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userMangaUq: uniqueIndex('favorites_user_manga_uq').on(t.userId, t.providerId, t.mangaId),
    userIdx: index('favorites_user_idx').on(t.userId),
    mangaIdx: index('favorites_manga_idx').on(t.providerId, t.mangaId),
  }),
);

export const progress = pgTable(
  'progress',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    providerId: text('provider_id').notNull(),
    mangaId: text('manga_id').notNull(),
    mangaTitle: text('manga_title'),
    mangaCoverUrl: text('manga_cover_url'),
    chapterId: text('chapter_id').notNull(),
    chapterNumber: text('chapter_number'),
    page: integer('page').notNull().default(0),
    totalPages: integer('total_pages'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userChapterUq: uniqueIndex('progress_user_chapter_uq').on(t.userId, t.chapterId),
    userMangaIdx: index('progress_user_manga_idx').on(t.userId, t.providerId, t.mangaId),
    userUpdatedIdx: index('progress_user_updated_idx').on(t.userId, t.updatedAt),
    mangaIdx: index('progress_manga_idx').on(t.providerId, t.mangaId),
  }),
);

export const visits = pgTable(
  'visits',
  {
    id: text('id').primaryKey(),
    ip: text('ip').notNull(),
    path: text('path').notNull(),
    userAgent: text('user_agent'),
    day: text('day').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ipDayUq: uniqueIndex('visits_ip_day_uq').on(t.ip, t.day),
    dayIdx: index('visits_day_idx').on(t.day),
    pathIdx: index('visits_path_idx').on(t.path),
  }),
);

export const friendships = pgTable(
  'friendships',
  {
    id: text('id').primaryKey(),
    requesterId: text('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    addresseeId: text('addressee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull(), // 'pending' | 'accepted'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pairUq: uniqueIndex('friendships_pair_uq').on(t.requesterId, t.addresseeId),
    requesterIdx: index('friendships_requester_idx').on(t.requesterId),
    addresseeIdx: index('friendships_addressee_idx').on(t.addresseeId),
    statusIdx: index('friendships_status_idx').on(t.status),
  }),
);

export type DbUser = typeof users.$inferSelect;
export type DbUserInsert = typeof users.$inferInsert;
export type DbLibraryEntry = typeof library.$inferSelect;
export type DbFavorite = typeof favorites.$inferSelect;
export type DbProgress = typeof progress.$inferSelect;
export type DbVisit = typeof visits.$inferSelect;
export type DbFriendship = typeof friendships.$inferSelect;
