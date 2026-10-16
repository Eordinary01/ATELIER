import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

let client: postgres.Sql | null = null;

export function getDbClient(connectionString?: string) {
  const url =
    connectionString ||
    process.env.DATABASE_URL ||
    'postgres://atelier_admin:atelier_dev_password@localhost:5433/atelier_commerce';

  if (!client) {
    client = postgres(url, {
      max: process.env.NODE_ENV === 'production' ? 20 : 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof getDbClient>;
