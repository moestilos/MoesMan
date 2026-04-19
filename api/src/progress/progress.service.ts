import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB_TOKEN, type Database } from '../db/db.module';
import { readingProgress } from '../db/schema';
import type { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class ProgressService {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async upsert(userId: string, dto: UpdateProgressDto) {
    const [row] = await this.db
      .insert(readingProgress)
      .values({
        userId,
        providerId: dto.providerId,
        mangaId: dto.mangaId,
        chapterId: dto.chapterId,
        chapterNumber: dto.chapterNumber ?? null,
        page: dto.page,
        totalPages: dto.totalPages ?? null,
      })
      .onConflictDoUpdate({
        target: [readingProgress.userId, readingProgress.providerId, readingProgress.chapterId],
        set: {
          page: dto.page,
          totalPages: dto.totalPages ?? null,
          chapterNumber: dto.chapterNumber ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  forManga(userId: string, providerId: string, mangaId: string) {
    return this.db
      .select()
      .from(readingProgress)
      .where(
        and(
          eq(readingProgress.userId, userId),
          eq(readingProgress.providerId, providerId),
          eq(readingProgress.mangaId, mangaId),
        ),
      )
      .orderBy(desc(readingProgress.updatedAt));
  }

  history(userId: string, limit = 30) {
    return this.db
      .select()
      .from(readingProgress)
      .where(eq(readingProgress.userId, userId))
      .orderBy(desc(readingProgress.updatedAt))
      .limit(limit);
  }
}
