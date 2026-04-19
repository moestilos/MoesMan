import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { sql } from 'drizzle-orm';

export const DB_TOKEN = 'DRIZZLE_DB';
export const POOL_TOKEN = 'PG_POOL';

export type Database = NodePgDatabase<typeof schema>;

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: POOL_TOKEN,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow<string>('DATABASE_URL');
        return new Pool({ connectionString: url, max: 10 });
      },
    },
    {
      provide: DB_TOKEN,
      inject: [POOL_TOKEN],
      useFactory: async (pool: Pool): Promise<Database> => {
        const db = drizzle(pool, { schema });
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
        return db;
      },
    },
  ],
  exports: [DB_TOKEN, POOL_TOKEN],
})
export class DbModule implements OnModuleDestroy {
  constructor() {}
  async onModuleDestroy() {}
}
