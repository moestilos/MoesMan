/**
 * Aplica migraciones ./drizzle al Postgres de DATABASE_URL.
 * DATABASE_URL debe estar en el entorno (docker-compose lo inyecta, en local: `export DATABASE_URL=...`).
 * Alternativa en desarrollo: `npm run db:push` (sincroniza sin migraciones).
 */
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
