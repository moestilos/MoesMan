import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN, type Database } from '../db/db.module';
import { users, type User } from '../db/schema';

@Injectable()
export class UsersService {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0];
  }

  async findById(id: string): Promise<User | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }

  async create(input: { email: string; username: string; passwordHash: string }): Promise<User> {
    const [row] = await this.db.insert(users).values(input).returning();
    return row;
  }
}
