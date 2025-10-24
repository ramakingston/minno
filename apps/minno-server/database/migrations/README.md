# Database Migrations

This directory contains all database migrations for the Minno project. Migrations are SQL scripts that modify the database schema in a versioned, sequential manner.

## Migration Files

- `001_initial_schema.sql` - Initial database schema with tables and triggers
- `002_add_indexes.sql` - Performance indexes for all tables

## Migration Naming Convention

Migration files follow this naming pattern:

```
NNN_description.sql
```

Where:
- `NNN` is a three-digit sequential number (001, 002, 003, etc.)
- `description` is a short, descriptive name using underscores
- Examples:
  - `003_add_user_preferences.sql`
  - `004_create_notifications_table.sql`
  - `005_add_cascade_deletes.sql`

## Running Migrations

### Using npm scripts

```bash
# Initialize database (run schema.sql)
npm run db:init

# Run all pending migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### Using TypeScript scripts

```bash
# Initialize database
npx tsx scripts/init-db.ts

# Run migrations
npx tsx scripts/migrate.ts

# Seed database
npx tsx scripts/seed.ts
```

### Manual execution

Connect to PostgreSQL and run migrations manually:

```bash
# Connect to database
psql $DATABASE_URL

# Run a specific migration
\i database/migrations/001_initial_schema.sql

# Or run all migrations in order
\i database/migrations/001_initial_schema.sql
\i database/migrations/002_add_indexes.sql
```

## Creating New Migrations

1. **Determine the next migration number**
   - Look at existing migrations and increment by 1
   - Use three digits (e.g., 003, 004, 005)

2. **Create the migration file**
   ```bash
   # Example: Creating migration 003
   touch database/migrations/003_add_user_preferences.sql
   ```

3. **Write the migration**
   - Include a header comment with description, date, and author
   - Write the migration SQL (CREATE, ALTER, INSERT, etc.)
   - Include a ROLLBACK section in comments showing how to undo the migration
   - Test the migration on a development database first

4. **Migration template**
   ```sql
   -- Migration: NNN_description.sql
   -- Description: What this migration does
   -- Date: YYYY-MM-DD
   -- Author: Your Name

   -- Your migration SQL here
   CREATE TABLE ...

   -- ============================================================================
   -- ROLLBACK
   -- ============================================================================
   -- To rollback this migration, run the following:
   --
   -- DROP TABLE IF EXISTS ...
   ```

## Migration Best Practices

1. **Always test migrations**
   - Test on a local/development database first
   - Test both the migration AND the rollback
   - Verify data integrity after migration

2. **Make migrations idempotent**
   - Use `IF NOT EXISTS` for CREATE statements
   - Use `IF EXISTS` for DROP statements
   - Migrations should be safe to run multiple times

3. **One logical change per migration**
   - Keep migrations focused on a single change
   - Don't mix unrelated schema changes
   - This makes rollbacks easier and clearer

4. **Include rollback instructions**
   - Document how to undo the migration
   - Put rollback SQL in a comment block at the end
   - Test rollback instructions

5. **Never modify existing migrations**
   - Once a migration is deployed, never change it
   - If you need to fix something, create a new migration
   - This maintains a consistent history

6. **Use transactions when possible**
   - Wrap migrations in BEGIN/COMMIT when appropriate
   - Some operations (like CREATE INDEX CONCURRENTLY) can't use transactions

## Rollback Strategy

To rollback a migration:

1. **Identify the migration to rollback**
   ```bash
   # List migrations
   ls -la database/migrations/
   ```

2. **Run the rollback SQL**
   - Each migration includes rollback instructions in comments
   - Copy the rollback SQL and execute it
   ```sql
   -- Example: Rollback migration 002
   DROP INDEX IF EXISTS idx_workspaces_slack_team_id;
   -- ... other rollback commands
   ```

3. **Update migration tracking**
   - If using a migration tracking table, remove the migration record
   - Document the rollback in your deployment notes

## Migration Tracking

The Minno project uses a simple tracking mechanism:

1. **migrations table**
   - Automatically created by the migration system
   - Tracks which migrations have been applied
   - Stores migration name and timestamp

2. **Checking migration status**
   ```sql
   SELECT * FROM migrations ORDER BY applied_at;
   ```

## Database Initialization vs Migration

- **Database Initialization** (`db:init`):
  - Runs `schema.sql` to create all tables from scratch
  - Used for new database setups
  - Includes all schema, indexes, triggers, and views

- **Migrations** (`db:migrate`):
  - Runs individual migration files in sequence
  - Used to update existing databases
  - Only runs migrations that haven't been applied yet

## Troubleshooting

### Migration fails partway through

1. Check PostgreSQL logs for error details
2. Manually inspect the database state
3. Run the rollback SQL to clean up
4. Fix the migration and try again

### Migration already applied

- The system tracks applied migrations
- Running migrations multiple times is safe (idempotent)
- Check the `migrations` table to see what's been applied

### Schema drift

If your database schema doesn't match migrations:

1. Back up your data
2. Drop and recreate the database
3. Run `db:init` or all migrations from scratch
4. Restore data if needed

## Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Migration Best Practices](https://www.prisma.io/dataguide/types/relational/migrations)
- [Keep a Changelog](https://keepachangelog.com/)
