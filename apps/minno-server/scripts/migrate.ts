#!/usr/bin/env tsx

/**
 * Database Migration Script
 *
 * This script runs pending database migrations in sequential order.
 * Migrations are tracked in the 'migrations' table to avoid re-running.
 *
 * Usage:
 *   npx tsx scripts/migrate.ts
 *   npm run db:migrate
 */

import pg from 'pg';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Migration {
  name: string;
  path: string;
  number: number;
}

interface MigrationRecord {
  id: number;
  name: string;
  applied_at: Date;
}

interface MigrateOptions {
  verbose?: boolean;
  dryRun?: boolean;
}

async function ensureMigrationsTable(client: pg.PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(client: pg.PoolClient): Promise<Set<string>> {
  const result = await client.query<MigrationRecord>(
    'SELECT name FROM migrations ORDER BY id'
  );
  return new Set(result.rows.map(row => row.name));
}

async function recordMigration(client: pg.PoolClient, name: string): Promise<void> {
  await client.query(
    'INSERT INTO migrations (name) VALUES ($1)',
    [name]
  );
}

function getMigrationFiles(): Migration[] {
  const migrationsDir = join(__dirname, '..', 'database', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql') && /^\d{3}_/.test(file))
    .sort();

  return files.map(file => {
    const number = parseInt(file.substring(0, 3), 10);
    return {
      name: file,
      path: join(migrationsDir, file),
      number,
    };
  });
}

async function runMigrations(options: MigrateOptions = {}) {
  const { verbose = false, dryRun = false } = options;

  // Validate environment
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔄 Running database migrations...\n');

  if (dryRun) {
    console.log('🏃 DRY RUN MODE - No changes will be made\n');
  }

  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();

  try {
    // Test connection
    if (verbose) {
      console.log('📡 Testing database connection...');
    }
    await client.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Ensure migrations table exists
    if (verbose) {
      console.log('📋 Ensuring migrations tracking table exists...');
    }
    if (!dryRun) {
      await ensureMigrationsTable(client);
    }
    console.log('✅ Migrations table ready\n');

    // Get applied migrations
    const appliedMigrations = dryRun ? new Set<string>() : await getAppliedMigrations(client);
    if (verbose && appliedMigrations.size > 0) {
      console.log('📝 Already applied migrations:');
      appliedMigrations.forEach(name => {
        console.log(`   ✓ ${name}`);
      });
      console.log('');
    }

    // Get migration files
    const migrations = getMigrationFiles();
    console.log(`📂 Found ${migrations.length} migration file(s)\n`);

    if (migrations.length === 0) {
      console.log('⚠️  No migration files found in database/migrations/');
      console.log('   Create migration files following the pattern: NNN_description.sql\n');
      return;
    }

    // Filter pending migrations
    const pendingMigrations = migrations.filter(m => !appliedMigrations.has(m.name));

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations - database is up to date\n');
      return;
    }

    console.log(`🔨 Pending migrations: ${pendingMigrations.length}\n`);

    // Run each pending migration
    for (const migration of pendingMigrations) {
      console.log(`⏳ Applying migration: ${migration.name}`);

      if (verbose) {
        console.log(`   Path: ${migration.path}`);
      }

      // Read migration file
      const sql = readFileSync(migration.path, 'utf-8');

      if (dryRun) {
        console.log(`   ✓ [DRY RUN] Would apply migration ${migration.name}`);
        continue;
      }

      try {
        // Begin transaction
        await client.query('BEGIN');

        // Execute migration
        await client.query(sql);

        // Record migration
        await recordMigration(client, migration.name);

        // Commit transaction
        await client.query('COMMIT');

        console.log(`   ✅ Successfully applied ${migration.name}\n`);

      } catch (error) {
        // Rollback on error
        await client.query('ROLLBACK');
        console.error(`   ❌ Failed to apply ${migration.name}`);
        throw error;
      }
    }

    if (dryRun) {
      console.log('\n✅ Dry run completed - no changes were made\n');
    } else {
      console.log('🎉 All migrations completed successfully!\n');

      // Show final migration status
      const finalApplied = await getAppliedMigrations(client);
      console.log(`📊 Total applied migrations: ${finalApplied.size}`);

      if (verbose) {
        console.log('\nApplied migrations:');
        const allMigrations = await client.query<MigrationRecord>(
          'SELECT name, applied_at FROM migrations ORDER BY id'
        );
        allMigrations.rows.forEach(row => {
          console.log(`   ✓ ${row.name} (${row.applied_at.toISOString()})`);
        });
      }
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: MigrateOptions = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  dryRun: args.includes('--dry-run') || args.includes('-d'),
};

// Run migrations
runMigrations(options).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
