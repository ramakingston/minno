-- Minno Database Common Queries
-- Quick reference for frequently used database queries

-- ============================================================================
-- WORKSPACE QUERIES
-- ============================================================================

-- Get all workspaces
SELECT
  id,
  slack_team_name,
  slack_team_id,
  notion_workspace_id,
  created_at,
  updated_at
FROM workspaces
ORDER BY created_at DESC;

-- Get workspace by Slack team ID
SELECT * FROM workspaces
WHERE slack_team_id = 'T1234567890';

-- Get workspaces with Notion integration
SELECT
  slack_team_name,
  notion_workspace_id,
  created_at
FROM workspaces
WHERE notion_workspace_id IS NOT NULL;

-- Count workspaces by integration status
SELECT
  COUNT(*) FILTER (WHERE notion_workspace_id IS NOT NULL) as with_notion,
  COUNT(*) FILTER (WHERE notion_workspace_id IS NULL) as without_notion,
  COUNT(*) as total
FROM workspaces;

-- ============================================================================
-- OAUTH TOKEN QUERIES
-- ============================================================================

-- Get all tokens for a workspace
SELECT
  provider,
  expires_at,
  scopes,
  created_at,
  updated_at
FROM oauth_tokens
WHERE workspace_id = '00000000-0000-0000-0000-000000000001'
ORDER BY provider;

-- Get Slack token for workspace
SELECT * FROM oauth_tokens
WHERE workspace_id = '...' AND provider = 'slack';

-- Get Notion token for workspace
SELECT * FROM oauth_tokens
WHERE workspace_id = '...' AND provider = 'notion';

-- Check expiring tokens (within 7 days)
SELECT
  w.slack_team_name,
  ot.provider,
  ot.expires_at,
  ot.expires_at - NOW() as time_until_expiry
FROM oauth_tokens ot
JOIN workspaces w ON ot.workspace_id = w.id
WHERE ot.expires_at IS NOT NULL
  AND ot.expires_at < NOW() + INTERVAL '7 days'
ORDER BY ot.expires_at ASC;

-- Count tokens by provider
SELECT
  provider,
  COUNT(*) as token_count
FROM oauth_tokens
GROUP BY provider
ORDER BY token_count DESC;

-- ============================================================================
-- MINNO SESSION QUERIES
-- ============================================================================

-- Get all active sessions
SELECT
  ms.id,
  w.slack_team_name,
  ms.slack_channel_id,
  ms.slack_thread_ts,
  ms.notion_task_id,
  ms.created_at,
  ms.updated_at
FROM minno_sessions ms
JOIN workspaces w ON ms.workspace_id = w.id
WHERE ms.status = 'active'
ORDER BY ms.updated_at DESC;

-- Get session by Slack thread
SELECT * FROM minno_sessions
WHERE slack_channel_id = 'C1234567890'
  AND slack_thread_ts = '1698765432.123456';

-- Get active sessions for a workspace
SELECT
  slack_channel_id,
  slack_thread_ts,
  notion_task_id,
  context->>'title' as title,
  updated_at
FROM minno_sessions
WHERE workspace_id = '...' AND status = 'active'
ORDER BY updated_at DESC;

-- Get session statistics by status
SELECT
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds
FROM minno_sessions
GROUP BY status
ORDER BY count DESC;

-- Get recent sessions (last 24 hours)
SELECT
  w.slack_team_name,
  ms.slack_channel_id,
  ms.status,
  ms.context->>'title' as title,
  ms.created_at
FROM minno_sessions ms
JOIN workspaces w ON ms.workspace_id = w.id
WHERE ms.created_at > NOW() - INTERVAL '24 hours'
ORDER BY ms.created_at DESC;

-- Find sessions with Notion integration
SELECT
  w.slack_team_name,
  ms.slack_channel_id,
  ms.notion_project_id,
  ms.notion_task_id,
  ms.status
FROM minno_sessions ms
JOIN workspaces w ON ms.workspace_id = w.id
WHERE ms.notion_task_id IS NOT NULL
ORDER BY ms.created_at DESC;

-- Sessions without Notion integration
SELECT
  w.slack_team_name,
  ms.slack_channel_id,
  ms.slack_thread_ts,
  ms.status,
  ms.created_at
FROM minno_sessions ms
JOIN workspaces w ON ms.workspace_id = w.id
WHERE ms.notion_task_id IS NULL
ORDER BY ms.created_at DESC;

-- ============================================================================
-- CONVERSATION MESSAGE QUERIES
-- ============================================================================

-- Get all messages for a session (chronological)
SELECT
  role,
  content,
  timestamp,
  slack_message_ts
FROM conversation_messages
WHERE session_id = '...'
ORDER BY timestamp ASC;

-- Get recent messages for a session
SELECT
  role,
  content,
  timestamp
FROM conversation_messages
WHERE session_id = '...'
ORDER BY timestamp DESC
LIMIT 10;

-- Get message count by role for a session
SELECT
  role,
  COUNT(*) as count
FROM conversation_messages
WHERE session_id = '...'
GROUP BY role
ORDER BY count DESC;

-- Get sessions with most messages
SELECT
  ms.id,
  w.slack_team_name,
  ms.context->>'title' as title,
  COUNT(cm.id) as message_count
FROM minno_sessions ms
JOIN workspaces w ON ms.workspace_id = w.id
LEFT JOIN conversation_messages cm ON ms.id = cm.session_id
GROUP BY ms.id, w.slack_team_name, ms.context
ORDER BY message_count DESC
LIMIT 10;

-- Get recent messages across all sessions
SELECT
  cm.role,
  cm.content,
  cm.timestamp,
  w.slack_team_name,
  ms.context->>'title' as session_title
FROM conversation_messages cm
JOIN minno_sessions ms ON cm.session_id = ms.id
JOIN workspaces w ON ms.workspace_id = w.id
ORDER BY cm.timestamp DESC
LIMIT 20;

-- Get user messages only
SELECT
  content,
  timestamp,
  metadata
FROM conversation_messages
WHERE session_id = '...' AND role = 'user'
ORDER BY timestamp ASC;

-- Get assistant responses only
SELECT
  content,
  timestamp,
  metadata
FROM conversation_messages
WHERE session_id = '...' AND role = 'assistant'
ORDER BY timestamp ASC;

-- ============================================================================
-- COMBINED QUERIES
-- ============================================================================

-- Workspace summary with counts
SELECT
  w.slack_team_name,
  w.notion_workspace_id,
  COUNT(DISTINCT ot.id) as token_count,
  COUNT(DISTINCT ms.id) as total_sessions,
  COUNT(DISTINCT ms.id) FILTER (WHERE ms.status = 'active') as active_sessions,
  COUNT(DISTINCT ms.id) FILTER (WHERE ms.status = 'completed') as completed_sessions,
  COUNT(DISTINCT cm.id) as total_messages
FROM workspaces w
LEFT JOIN oauth_tokens ot ON w.id = ot.workspace_id
LEFT JOIN minno_sessions ms ON w.id = ms.workspace_id
LEFT JOIN conversation_messages cm ON ms.id = cm.session_id
GROUP BY w.id, w.slack_team_name, w.notion_workspace_id
ORDER BY w.slack_team_name;

-- Session details with message count
SELECT
  w.slack_team_name,
  ms.slack_channel_id,
  ms.slack_thread_ts,
  ms.status,
  ms.context->>'title' as title,
  ms.notion_task_id,
  COUNT(cm.id) as message_count,
  MIN(cm.timestamp) as first_message,
  MAX(cm.timestamp) as last_message,
  ms.created_at,
  ms.updated_at
FROM minno_sessions ms
JOIN workspaces w ON ms.workspace_id = w.id
LEFT JOIN conversation_messages cm ON ms.id = cm.session_id
GROUP BY ms.id, w.slack_team_name
ORDER BY ms.updated_at DESC;

-- Active sessions view (using the view)
SELECT * FROM active_sessions_view
ORDER BY updated_at DESC;

-- Daily activity report
SELECT
  DATE(cm.timestamp) as date,
  COUNT(DISTINCT ms.id) as active_sessions,
  COUNT(cm.id) as total_messages,
  COUNT(DISTINCT ms.workspace_id) as active_workspaces
FROM conversation_messages cm
JOIN minno_sessions ms ON cm.session_id = ms.id
WHERE cm.timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(cm.timestamp)
ORDER BY date DESC;

-- ============================================================================
-- MAINTENANCE QUERIES
-- ============================================================================

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Find unused indexes (never scanned)
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check for dead rows (needs VACUUM)
SELECT
  schemaname,
  tablename,
  n_dead_tup,
  n_live_tup,
  ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_pct
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;

-- Update table statistics
ANALYZE workspaces;
ANALYZE oauth_tokens;
ANALYZE minno_sessions;
ANALYZE conversation_messages;

-- Vacuum tables (reclaim space)
VACUUM ANALYZE workspaces;
VACUUM ANALYZE oauth_tokens;
VACUUM ANALYZE minno_sessions;
VACUUM ANALYZE conversation_messages;

-- ============================================================================
-- DATA CLEANUP QUERIES
-- ============================================================================

-- Archive old completed sessions (older than 30 days)
UPDATE minno_sessions
SET status = 'archived'
WHERE status = 'completed'
  AND updated_at < NOW() - INTERVAL '30 days';

-- Delete very old archived sessions (older than 90 days)
-- This will cascade delete all messages due to ON DELETE CASCADE
DELETE FROM minno_sessions
WHERE status = 'archived'
  AND updated_at < NOW() - INTERVAL '90 days';

-- Find sessions with no messages
SELECT
  ms.id,
  w.slack_team_name,
  ms.slack_channel_id,
  ms.created_at
FROM minno_sessions ms
JOIN workspaces w ON ms.workspace_id = w.id
LEFT JOIN conversation_messages cm ON ms.id = cm.session_id
WHERE cm.id IS NULL;

-- Delete sessions with no messages (cleanup)
DELETE FROM minno_sessions ms
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_messages cm
  WHERE cm.session_id = ms.id
);
