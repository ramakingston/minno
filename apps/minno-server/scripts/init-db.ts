#!/usr/bin/env tsx

/**
 * Database Initialization Script
 *
 * This script initializes the Minno database by running the complete schema.sql file.
 * Use this for setting up a new database from scratch.
 *
 * Usage:
 *   npx tsx scripts/init-db.ts
 *   npm run db:init
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface InitOptions {
  force?: boolean;  // Drop existing tables before creating
  verbose?: boolean;
}

async function initializeDatabase(options: InitOptions = {}) {
  const { force = false, verbose = false } = options;

  // Validate environment
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔄 Initializing Minno database...\n');

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

    // Check if tables already exist
    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('workspaces', 'oauth_tokens', 'minno_sessions', 'conversation_messages')
    `);

    if (tablesResult.rows.length > 0 && !force) {
      console.log('⚠️  WARNING: Database tables already exist:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.tablename}`);
      });
      console.log('\n❌ Initialization aborted. Use --force to drop and recreate tables.');
      console.log('   npx tsx scripts/init-db.ts --force\n');
      process.exit(1);
    }

    // Drop existing tables if force option is enabled
    if (force && tablesResult.rows.length > 0) {
      console.log('⚠️  Forcing reinitialization - dropping existing tables...');
      await client.query(`
        DROP TABLE IF EXISTS conversation_messages CASCADE;
        DROP TABLE IF EXISTS minno_sessions CASCADE;
        DROP TABLE IF EXISTS oauth_tokens CASCADE;
        DROP TABLE IF EXISTS workspaces CASCADE;
        DROP VIEW IF EXISTS active_sessions_view CASCADE;
        DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
      `);
      console.log('✅ Existing tables dropped\n');
    }

    // Read schema file
    const schemaPath = join(__dirname, '..', 'database', 'schema.sql');
    if (verbose) {
      console.log(`📄 Reading schema from: ${schemaPath}`);
    }
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute schema
    console.log('🔨 Creating database schema...');
    await client.query(schema);
    console.log('✅ Schema created successfully\n');

    // Verify tables were created
    const verifyResult = await client.query(`
      SELECT
        tablename,
        schemaname
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('workspaces', 'oauth_tokens', 'minno_sessions', 'conversation_messages')
      ORDER BY tablename
    `);

    console.log('📊 Created tables:');
    verifyResult.rows.forEach(row => {
      console.log(`   ✓ ${row.tablename}`);
    });

    // Verify indexes
    const indexResult = await client.query(`
      SELECT
        indexname,
        tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('workspaces', 'oauth_tokens', 'minno_sessions', 'conversation_messages')
      ORDER BY tablename, indexname
    `);

    console.log(`\n📑 Created indexes: ${indexResult.rows.length}`);
    if (verbose) {
      indexResult.rows.forEach(row => {
        console.log(`   ✓ ${row.tablename}.${row.indexname}`);
      });
    }

    // Verify triggers
    const triggerResult = await client.query(`
      SELECT
        trigger_name,
        event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      AND event_object_table IN ('workspaces', 'oauth_tokens', 'minno_sessions')
      ORDER BY event_object_table, trigger_name
    `);

    console.log(`\n⚡ Created triggers: ${triggerResult.rows.length}`);
    if (verbose) {
      triggerResult.rows.forEach(row => {
        console.log(`   ✓ ${row.event_object_table}.${row.trigger_name}`);
      });
    }

    // Verify views
    const viewResult = await client.query(`
      SELECT
        viewname
      FROM pg_views
      WHERE schemaname = 'public'
      ORDER BY viewname
    `);

    console.log(`\n👁️  Created views: ${viewResult.rows.length}`);
    if (verbose) {
      viewResult.rows.forEach(row => {
        console.log(`   ✓ ${row.viewname}`);
      });
    }

    console.log('\n🎉 Database initialization completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Run migrations: npm run db:migrate');
    console.log('  2. Seed test data: npm run db:seed\n');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: InitOptions = {
  force: args.includes('--force') || args.includes('-f'),
  verbose: args.includes('--verbose') || args.includes('-v'),
};

// Run initialization
initializeDatabase(options).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
