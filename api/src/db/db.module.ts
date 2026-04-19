import { Global, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

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
      inject: [POOL_TOKEN, ConfigService],
      useFactory: async (pool: Pool, config: ConfigService): Promise<Database> => {
        const db = drizzle(pool, { schema });
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

        const autoMigrate = config.get<string>('AUTO_MIGRATE', 'true') !== 'false';
        if (autoMigrate) {
          const candidates = [
            join(process.cwd(), 'drizzle'),
            join(__dirname, '../../drizzle'),
          ];
          const folder = candidates.find((p) => existsSync(p));
          if (folder) {
            try {
              await migrate(db, { migrationsFolder: folder });
              Logger.log(`✓ migrations aplicadas desde ${folder}`, 'DbModule');
            } catch (e) {
              Logger.error(`Migraciones fallaron: ${(e as Error).message}`, 'DbModule');
              throw e;
            }
          } else {
            Logger.warn('No se encontró carpeta drizzle/ — saltando migraciones', 'DbModule');
          }
        }
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
