import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB_TOKEN, type Database } from '../db/db.module';
import { favorites } from '../db/schema';

@Injectable()
export class FavoritesService {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  list(userId: string) {
    return this.db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.addedAt));
  }

  async toggle(userId: string, providerId: string, mangaId: string) {
    const existing = await this.db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.providerId, providerId),
          eq(favorites.mangaId, mangaId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await this.db.delete(favorites).where(eq(favorites.id, existing[0].id));
      return { favorite: false };
    }
    await this.db.insert(favorites).values({ userId, providerId, mangaId });
    return { favorite: true };
  }
}
