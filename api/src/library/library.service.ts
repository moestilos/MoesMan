import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB_TOKEN, type Database } from '../db/db.module';
import { libraryEntries } from '../db/schema';
import type { AddMangaDto } from './dto/add-manga.dto';

@Injectable()
export class LibraryService {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  list(userId: string) {
    return this.db
      .select()
      .from(libraryEntries)
      .where(eq(libraryEntries.userId, userId))
      .orderBy(desc(libraryEntries.addedAt));
  }

  async add(userId: string, dto: AddMangaDto) {
    const [row] = await this.db
      .insert(libraryEntries)
      .values({
        userId,
        providerId: dto.providerId,
        mangaId: dto.mangaId,
        title: dto.title,
        coverUrl: dto.coverUrl ?? null,
      })
      .onConflictDoUpdate({
        target: [libraryEntries.userId, libraryEntries.providerId, libraryEntries.mangaId],
        set: { title: dto.title, coverUrl: dto.coverUrl ?? null },
      })
      .returning();
    return row;
  }

  async remove(userId: string, providerId: string, mangaId: string) {
    const rows = await this.db
      .delete(libraryEntries)
      .where(
        and(
          eq(libraryEntries.userId, userId),
          eq(libraryEntries.providerId, providerId),
          eq(libraryEntries.mangaId, mangaId),
        ),
      )
      .returning({ id: libraryEntries.id });
    return { removed: rows.length };
  }

  async has(userId: string, providerId: string, mangaId: string) {
    const rows = await this.db
      .select({ id: libraryEntries.id })
      .from(libraryEntries)
      .where(
        and(
          eq(libraryEntries.userId, userId),
          eq(libraryEntries.providerId, providerId),
          eq(libraryEntries.mangaId, mangaId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }
}
