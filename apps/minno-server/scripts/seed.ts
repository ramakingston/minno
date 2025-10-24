#!/usr/bin/env tsx

/**
 * Database Seed Script
 *
 * This script loads sample data into the database for development and testing.
 * WARNING: This will DELETE existing data in the tables before seeding!
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *   npm run db:seed
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

interface SeedOptions {
  verbose?: boolean;
  force?: boolean;
}

async function seedDatabase(options: SeedOptions = {}) {
  const { verbose = false, force = false } = options;

  // Validate environment
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Safety check for production
  if (process.env.NODE_ENV === 'production' && !force) {
    console.error('❌ ERROR: Seeding is not allowed in production environment');
    console.error('   Use --force flag to override this safety check');
    process.exit(1);
  }

  console.log('🌱 Seeding Minno database...\n');

  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  WARNING: Running in PRODUCTION environment!');
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

    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('workspaces', 'oauth_tokens', 'minno_sessions', 'conversation_messages')
    `);

    if (tablesResult.rows.length === 0) {
      console.error('❌ ERROR: Required tables do not exist');
      console.error('   Run database initialization first: npm run db:init\n');
      process.exit(1);
    }

    // Warn about data deletion
    console.log('⚠️  WARNING: This will DELETE all existing data in:');
    console.log('   - workspaces');
    console.log('   - oauth_tokens');
    console.log('   - minno_sessions');
    console.log('   - conversation_messages\n');

    // Check if data already exists
    const dataCheck = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM workspaces) as workspace_count,
        (SELECT COUNT(*) FROM oauth_tokens) as token_count,
        (SELECT COUNT(*) FROM minno_sessions) as session_count,
        (SELECT COUNT(*) FROM conversation_messages) as message_count
    `);

    const counts = dataCheck.rows[0];
    if (parseInt(counts.workspace_count) > 0 || parseInt(counts.token_count) > 0) {
      console.log('📊 Existing data:');
      console.log(`   - ${counts.workspace_count} workspaces`);
      console.log(`   - ${counts.token_count} OAuth tokens`);
      console.log(`   - ${counts.session_count} sessions`);
      console.log(`   - ${counts.message_count} messages\n`);
    }

    // Read seed file
    const seedPath = join(__dirname, '..', 'database', 'seed.sql');
    if (verbose) {
      console.log(`📄 Reading seed data from: ${seedPath}`);
    }
    const seedSql = readFileSync(seedPath, 'utf-8');

    // Execute seed
    console.log('🌱 Loading seed data...\n');
    await client.query(seedSql);

    // Verify seed data
    const verifyResult = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM workspaces) as workspace_count,
        (SELECT COUNT(*) FROM oauth_tokens) as token_count,
        (SELECT COUNT(*) FROM minno_sessions) as session_count,
        (SELECT COUNT(*) FROM conversation_messages) as message_count
    `);

    const result = verifyResult.rows[0];
    console.log('✅ Seed data loaded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${result.workspace_count} workspaces`);
    console.log(`   - ${result.token_count} OAuth tokens`);
    console.log(`   - ${result.session_count} sessions`);
    console.log(`   - ${result.message_count} messages\n`);

    if (verbose) {
      // Show workspace details
      const workspaces = await client.query(`
        SELECT
          w.slack_team_name,
          w.slack_team_id,
          w.notion_workspace_id,
          COUNT(DISTINCT ot.id) as token_count,
          COUNT(DISTINCT ms.id) as session_count,
          COUNT(DISTINCT ms.id) FILTER (WHERE ms.status = 'active') as active_sessions
        FROM workspaces w
        LEFT JOIN oauth_tokens ot ON w.id = ot.workspace_id
        LEFT JOIN minno_sessions ms ON w.id = ms.workspace_id
        GROUP BY w.id, w.slack_team_name, w.slack_team_id, w.notion_workspace_id
        ORDER BY w.slack_team_name
      `);

      console.log('🏢 Workspaces:');
      workspaces.rows.forEach(ws => {
        console.log(`\n   ${ws.slack_team_name} (${ws.slack_team_id})`);
        console.log(`   - OAuth tokens: ${ws.token_count}`);
        console.log(`   - Total sessions: ${ws.session_count}`);
        console.log(`   - Active sessions: ${ws.active_sessions}`);
        console.log(`   - Notion workspace: ${ws.notion_workspace_id || 'Not connected'}`);
      });
      console.log('');

      // Show session details
      const sessions = await client.query(`
        SELECT
          ms.slack_channel_id,
          ms.slack_thread_ts,
          ms.status,
          ms.context->>'title' as title,
          w.slack_team_name,
          COUNT(cm.id) as message_count
        FROM minno_sessions ms
        JOIN workspaces w ON ms.workspace_id = w.id
        LEFT JOIN conversation_messages cm ON ms.id = cm.session_id
        GROUP BY ms.id, ms.slack_channel_id, ms.slack_thread_ts, ms.status, ms.context, w.slack_team_name
        ORDER BY ms.created_at DESC
      `);

      console.log('💬 Sessions:');
      sessions.rows.forEach(session => {
        console.log(`\n   ${session.title || 'Untitled'} (${session.status})`);
        console.log(`   - Workspace: ${session.slack_team_name}`);
        console.log(`   - Thread: ${session.slack_thread_ts}`);
        console.log(`   - Messages: ${session.message_count}`);
      });
      console.log('');
    }

    console.log('🎉 Database seeding completed successfully!\n');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: SeedOptions = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  force: args.includes('--force') || args.includes('-f'),
};

// Run seeding
seedDatabase(options).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
