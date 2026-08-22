import knex, { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';
import { getTenantSlug } from '@genyuga/shared-context';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

let _pool: Knex | null = null;

export function getPool(): Knex {
  if (!_pool) {
    _pool = knex({
      client: 'pg',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'genyuga',
      },
      pool: { min: 2, max: 10 }
    });
  }
  return _pool;
}

/**
 * Returns a knex instance proxy that automatically scopes all queries
 * to the current tenant's schema using search_path.
 */
export function getDb(): Knex {
  const pool = getPool();
  const schema = getTenantSlug();

  // If using public schema, just return the pool
  if (schema === 'public' || !schema) {
    return pool;
  }

  // For tenant-specific schemas, use the search_path
  // Note: For better performance with many tenants, one might use 
  // pool.withSchema(schema) or set search_path per query.
  // Using withSchema is most robust with Knex.
  return pool.withSchema(schema) as unknown as Knex;
}

export type { Knex } from 'knex';
