import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../../lib/env";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
});

export const db = drizzle(pool, { logger: false });

export async function healthcheck(): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("select 1");
    return true;
  } finally {
    client.release();
  }
}
