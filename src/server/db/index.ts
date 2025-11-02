import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { PoolConfig } from 'pg';

const config: PoolConfig = {
  connectionString: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres',
  max: 10
};

const pool = new Pool(config);

export const db = drizzle(pool);