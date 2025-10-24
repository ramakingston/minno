# Minno Database Documentation

This directory contains the complete database schema, migrations, and seed data for the Minno project.

## Table of Contents

- [Overview](#overview)
- [Database Schema](#database-schema)
- [Quick Start](#quick-start)
- [Database Scripts](#database-scripts)
- [Table Descriptions](#table-descriptions)
- [Relationships](#relationships)
- [Indexes and Performance](#indexes-and-performance)
- [Security Considerations](#security-considerations)

## Overview

Minno uses PostgreSQL 14+ as its database. The schema is designed to:
- Track Slack workspaces and their Notion integrations
- Store encrypted OAuth tokens for multiple providers
- Maintain conversation sessions linked to Slack threads
- Preserve conversation history with full context

## Database Schema

The complete schema is defined in `schema.sql` and includes:

- **4 main tables**: workspaces, oauth_tokens, minno_sessions, conversation_messages
- **10+ indexes**: Optimized for common query patterns
- **3 triggers**: Auto-update timestamps on changes
- **1 view**: active_sessions_view for convenient querying

### Schema Diagram

```
┌─────────────────┐
│   workspaces    │
│─────────────────│
│ id (PK)         │
│ slack_team_id   │◄─────┐
│ slack_team_name │      │
│ notion_wksp_id  │      │
└─────────────────┘      │
                         │
                    ┌────┴─────────────┐
                    │                  │
         ┌──────────┴──────────┐  ┌───┴──────────────┐
         │   oauth_tokens      │  │  minno_sessions  │
         │─────────────────────│  │──────────────────│
         │ id (PK)             │  │ id (PK)          │
         │ workspace_id (FK)   │  │ workspace_id (FK)│◄──┐
         │ provider            │  │ slack_channel_id │   │
         │ access_token_enc    │  │ slack_thread_ts  │   │
         │ refresh_token_enc   │  │ notion_project_id│   │
         │ expires_at          │  │ notion_task_id   │   │
         │ scopes[]            │  │ context (JSONB)  │   │
         │ metadata (JSONB)    │  │ status           │   │
         └─────────────────────┘  └──────────────────┘   │
                                                          │
                                  ┌───────────────────────┘
                                  │
                          ┌───────┴────────────────┐
                          │ conversation_messages  │
                          │────────────────────────│
                          │ id (PK)                │
                          │ session_id (FK)        │
                          │ role                   │
                          │ content                │
                          │ metadata (JSONB)       │
                          │ timestamp              │
                          │ slack_message_ts       │
                          └────────────────────────┘
```

## Quick Start

### 1. Set up environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and set DATABASE_URL
# DATABASE_URL=postgresql://user:password@localhost:5432/minno
```

### 2. Initialize database

```bash
# Run schema initialization
npm run db:init

# Or use the TypeScript script directly
npx tsx scripts/init-db.ts
```

### 3. Run migrations

```bash
# Apply all pending migrations
npm run db:migrate
```

### 4. Seed development data (optional)

```bash
# Load sample data for development
npm run db:seed
```

## Database Scripts

### init-db.ts

Initializes the database by running `schema.sql`. This creates all tables, indexes, triggers, and views from scratch.

```bash
# Initialize database
npm run db:init

# Force reinitialize (drops existing tables)
npx tsx scripts/init-db.ts --force

# Verbose output
npx tsx scripts/init-db.ts --verbose
```

**Options:**
- `--force, -f`: Drop existing tables before creating
- `--verbose, -v`: Show detailed output

### migrate.ts

Runs pending database migrations in sequential order. Tracks applied migrations to avoid re-running.

```bash
# Run all pending migrations
npm run db:migrate

# Dry run (show what would be applied)
npx tsx scripts/migrate.ts --dry-run

# Verbose output
npx tsx scripts/migrate.ts --verbose
```

**Options:**
- `--dry-run, -d`: Show pending migrations without applying
- `--verbose, -v`: Show detailed output

### seed.ts

Loads sample data into the database for development and testing.

**WARNING:** This script deletes existing data before seeding!

```bash
# Load seed data
npm run db:seed

# Force seed in production (not recommended)
npx tsx scripts/seed.ts --force

# Verbose output with details
npx tsx scripts/seed.ts --verbose
```

**Options:**
- `--force, -f`: Override production safety check
- `--verbose, -v`: Show detailed workspace and session information

## Table Descriptions

### workspaces

Stores information about each Slack workspace using Minno.

**Columns:**
- `id` (UUID, PK): Unique workspace identifier
- `slack_team_id` (VARCHAR, UNIQUE): Slack workspace ID (e.g., T1234567890)
- `slack_team_name` (VARCHAR): Human-readable workspace name
- `notion_workspace_id` (VARCHAR, NULL): Optional linked Notion workspace
- `created_at` (TIMESTAMP): When workspace was added
- `updated_at` (TIMESTAMP): Last update time (auto-updated via trigger)

**Indexes:**
- `idx_workspaces_slack_team_id`: Fast lookups by Slack team ID

**Common Queries:**
```sql
-- Get workspace by Slack team ID
SELECT * FROM workspaces WHERE slack_team_id = 'T1234567890';

-- List all workspaces with Notion integration
SELECT * FROM workspaces WHERE notion_workspace_id IS NOT NULL;
```

### oauth_tokens

Stores encrypted OAuth tokens for various service providers (Slack, Notion, Google, etc.).

**Columns:**
- `id` (UUID, PK): Unique token record identifier
- `workspace_id` (UUID, FK): References workspaces(id)
- `provider` (VARCHAR): Service provider name (slack, notion, google, etc.)
- `access_token_encrypted` (TEXT): Base64-encoded encrypted access token
- `refresh_token_encrypted` (TEXT, NULL): Base64-encoded encrypted refresh token
- `expires_at` (TIMESTAMP, NULL): Token expiration time
- `scopes` (TEXT[]): Array of OAuth scopes granted
- `metadata` (JSONB): Provider-specific metadata (bot_user_id, team_id, etc.)
- `created_at` (TIMESTAMP): When token was stored
- `updated_at` (TIMESTAMP): Last update time (auto-updated via trigger)

**Constraints:**
- `UNIQUE(workspace_id, provider)`: One token per provider per workspace

**Indexes:**
- `idx_oauth_tokens_workspace_provider`: Fast lookups by workspace and provider
- `idx_oauth_tokens_provider`: Fast lookups by provider

**Common Queries:**
```sql
-- Get Slack token for a workspace
SELECT * FROM oauth_tokens
WHERE workspace_id = '...' AND provider = 'slack';

-- List all providers for a workspace
SELECT provider, expires_at FROM oauth_tokens
WHERE workspace_id = '...'
ORDER BY provider;
```

### minno_sessions

Tracks conversation sessions between Slack threads and Notion tasks.

**Columns:**
- `id` (UUID, PK): Unique session identifier
- `workspace_id` (UUID, FK): References workspaces(id)
- `slack_channel_id` (VARCHAR): Slack channel where conversation occurs
- `slack_thread_ts` (VARCHAR): Slack thread timestamp (unique per channel)
- `notion_project_id` (VARCHAR, NULL): Associated Notion project/database ID
- `notion_task_id` (VARCHAR, NULL): Associated Notion task/page ID
- `context` (JSONB): Session context (history, state, metadata)
- `status` (VARCHAR): Session status (active, completed, failed, archived)
- `created_at` (TIMESTAMP): When session started
- `updated_at` (TIMESTAMP): Last activity time (auto-updated via trigger)

**Constraints:**
- `UNIQUE(slack_channel_id, slack_thread_ts)`: One session per Slack thread

**Indexes:**
- `idx_minno_sessions_workspace_status`: Fast workspace + status queries
- `idx_minno_sessions_slack_thread`: Fast thread lookups
- `idx_minno_sessions_notion_project`: Fast Notion project lookups (partial index)
- `idx_minno_sessions_notion_task`: Fast Notion task lookups (partial index)
- `idx_minno_sessions_created_at`: Fast time-based queries

**Common Queries:**
```sql
-- Get active sessions for a workspace
SELECT * FROM minno_sessions
WHERE workspace_id = '...' AND status = 'active'
ORDER BY updated_at DESC;

-- Get session by Slack thread
SELECT * FROM minno_sessions
WHERE slack_channel_id = 'C1234567890'
  AND slack_thread_ts = '1698765432.123456';

-- Get recent sessions
SELECT * FROM minno_sessions
ORDER BY created_at DESC
LIMIT 10;
```

### conversation_messages

Stores individual messages within conversation sessions.

**Columns:**
- `id` (UUID, PK): Unique message identifier
- `session_id` (UUID, FK): References minno_sessions(id)
- `role` (VARCHAR): Message role (user, assistant, tool, system)
- `content` (TEXT): Message content (can be Markdown)
- `metadata` (JSONB): Message metadata (Slack blocks, tool results, etc.)
- `timestamp` (TIMESTAMP): When message was sent
- `slack_message_ts` (VARCHAR, NULL): Reference to Slack message timestamp

**Indexes:**
- `idx_conversation_messages_session_timestamp`: Fast session message queries
- `idx_conversation_messages_slack_ts`: Fast Slack message lookups (partial index)

**Common Queries:**
```sql
-- Get all messages for a session (chronological order)
SELECT * FROM conversation_messages
WHERE session_id = '...'
ORDER BY timestamp ASC;

-- Get recent messages for a session
SELECT * FROM conversation_messages
WHERE session_id = '...'
ORDER BY timestamp DESC
LIMIT 10;

-- Get user messages only
SELECT * FROM conversation_messages
WHERE session_id = '...' AND role = 'user'
ORDER BY timestamp ASC;
```

## Relationships

### Foreign Key Constraints

All foreign keys use `ON DELETE CASCADE` to automatically clean up related records:

```
workspaces
  └─► oauth_tokens (CASCADE)
  └─► minno_sessions (CASCADE)
        └─► conversation_messages (CASCADE)
```

**What this means:**
- Deleting a workspace automatically deletes all its OAuth tokens and sessions
- Deleting a session automatically deletes all its messages
- This maintains referential integrity and prevents orphaned records

## Indexes and Performance

### Index Strategy

The database uses several index types for optimal performance:

1. **Simple indexes**: Single-column lookups (e.g., slack_team_id)
2. **Composite indexes**: Multi-column queries (e.g., workspace_id + status)
3. **Partial indexes**: Conditional indexes to save space (e.g., WHERE NOT NULL)

### Query Optimization Tips

```sql
-- GOOD: Uses idx_minno_sessions_workspace_status
SELECT * FROM minno_sessions
WHERE workspace_id = '...' AND status = 'active';

-- GOOD: Uses idx_conversation_messages_session_timestamp
SELECT * FROM conversation_messages
WHERE session_id = '...'
ORDER BY timestamp ASC;

-- AVOID: Table scan (no index on status alone)
SELECT * FROM minno_sessions WHERE status = 'active';

-- BETTER: Add workspace_id filter to use composite index
SELECT * FROM minno_sessions
WHERE workspace_id = '...' AND status = 'active';
```

### Performance Monitoring

```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Find slow queries
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%minno_%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Security Considerations

### Token Encryption

OAuth tokens are stored encrypted:
- `access_token_encrypted`: Base64-encoded encrypted access token
- `refresh_token_encrypted`: Base64-encoded encrypted refresh token

**Implementation Notes:**
- Use a strong encryption algorithm (AES-256-GCM recommended)
- Store encryption keys in environment variables, never in code
- Rotate encryption keys periodically
- Consider using PostgreSQL's pgcrypto extension for database-level encryption

### Connection Security

```javascript
// Production: Use SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Development: SSL optional
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
```

### Access Control

- Use dedicated database users with minimal privileges
- Grant only necessary permissions (SELECT, INSERT, UPDATE, DELETE)
- Never expose database credentials in client-side code
- Use connection pooling to limit concurrent connections

### Data Protection

```sql
-- Audit log example (optional)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(255),
  operation VARCHAR(10),
  user_id VARCHAR(255),
  changed_data JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Backup and Recovery

### Backup Strategy

```bash
# Full database backup
pg_dump $DATABASE_URL > backup.sql

# Schema only
pg_dump --schema-only $DATABASE_URL > schema-backup.sql

# Data only
pg_dump --data-only $DATABASE_URL > data-backup.sql

# Compressed backup
pg_dump $DATABASE_URL | gzip > backup.sql.gz
```

### Restore Strategy

```bash
# Restore from backup
psql $DATABASE_URL < backup.sql

# Restore compressed backup
gunzip -c backup.sql.gz | psql $DATABASE_URL
```

## Troubleshooting

### Common Issues

**Connection refused:**
```bash
# Check PostgreSQL is running
pg_isready

# Check DATABASE_URL is correct
echo $DATABASE_URL
```

**Permission denied:**
```sql
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE minno TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
```

**Slow queries:**
```sql
-- Analyze tables to update statistics
ANALYZE workspaces;
ANALYZE oauth_tokens;
ANALYZE minno_sessions;
ANALYZE conversation_messages;

-- Reindex if needed
REINDEX DATABASE minno;
```

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Migration Best Practices](https://www.prisma.io/dataguide/types/relational/migrations)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [pg Node.js Driver](https://node-postgres.com/)
