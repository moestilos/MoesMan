/**
 * Auto-migración en arranque. Usa drizzle-kit migrate con archivos ./drizzle
 * Para desarrollo/F2 también se puede usar `drizzle-kit push` directamente.
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
  await migrate(db, { migrationsFolder: './drizzle' });
  await pool.end();
  // eslint-disable-next-line no-console
  console.log('✓ migrations applied');
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
