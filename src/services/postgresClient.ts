/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POLARX Direct PostgreSQL Connection Client
 * Manages server-side connection pooling to Supabase PostgreSQL database.
 */

import { Pool } from 'pg';

let pgPool: Pool | null = null;

export function getPostgresPool(): Pool | null {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.DATABASE_POOLER_URL ||
    'postgresql://postgres:zvribsuqczmgxflkwgdd@db.towrhqfkcgtiiwynmkaq.supabase.co:5432/postgres';

  if (!pgPool && connectionString) {
    try {
      pgPool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      pgPool.on('error', (err) => {
        console.error('Unexpected error on idle PostgreSQL client', err);
      });
    } catch (err) {
      console.warn('Failed to initialize PostgreSQL pool:', err);
    }
  }

  return pgPool;
}

export async function queryPostgres<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const pool = getPostgresPool();
  if (!pool) {
    throw new Error('PostgreSQL database pool is not configured.');
  }

  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}
