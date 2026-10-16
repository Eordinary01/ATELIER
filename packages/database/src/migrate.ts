import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

async function runMigrations() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgres://atelier_admin:atelier_dev_password@localhost:5433/atelier_commerce';

  console.log('Connecting to PostgreSQL for migrations...');
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  console.log('Applying pending Drizzle migrations...');
  await migrate(db, { migrationsFolder: path.resolve(__dirname, '../drizzle') });

  console.log('Migrations applied successfully.');
  await migrationClient.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
