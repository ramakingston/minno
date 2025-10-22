-- Migration: 002_add_indexes.sql
-- Description: Add indexes for improved query performance
-- Date: 2025-10-22
-- Author: Minno Team

-- ============================================================================
-- WORKSPACES INDEXES
-- ============================================================================

-- Index for quick lookups by Slack team ID
CREATE INDEX IF NOT EXISTS idx_workspaces_slack_team_id
  ON workspaces(slack_team_id);

-- ============================================================================
-- OAUTH_TOKENS INDEXES
-- ============================================================================

-- Composite index for efficient workspace + provider lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_workspace_provider
  ON oauth_tokens(workspace_id, provider);

-- Index for queries filtering by provider
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider
  ON oauth_tokens(provider);

-- ============================================================================
-- MINNO_SESSIONS INDEXES
-- ============================================================================

-- Composite index for workspace status queries (e.g., get all active sessions for workspace)
CREATE INDEX IF NOT EXISTS idx_minno_sessions_workspace_status
  ON minno_sessions(workspace_id, status);

-- Composite index for Slack thread lookups (unique together, but indexed for performance)
CREATE INDEX IF NOT EXISTS idx_minno_sessions_slack_thread
  ON minno_sessions(slack_channel_id, slack_thread_ts);

-- Partial index for Notion project queries (only index non-null values)
CREATE INDEX IF NOT EXISTS idx_minno_sessions_notion_project
  ON minno_sessions(notion_project_id)
  WHERE notion_project_id IS NOT NULL;

-- Partial index for Notion task queries (only index non-null values)
CREATE INDEX IF NOT EXISTS idx_minno_sessions_notion_task
  ON minno_sessions(notion_task_id)
  WHERE notion_task_id IS NOT NULL;

-- Index for time-based queries (e.g., recent sessions)
CREATE INDEX IF NOT EXISTS idx_minno_sessions_created_at
  ON minno_sessions(created_at DESC);

-- ============================================================================
-- CONVERSATION_MESSAGES INDEXES
-- ============================================================================

-- Composite index for session message queries ordered by time
-- This is the most common query pattern: get all messages for a session in chronological order
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_timestamp
  ON conversation_messages(session_id, timestamp);

-- Partial index for Slack message timestamp lookups (only index non-null values)
-- Useful for finding messages by their Slack timestamp
CREATE INDEX IF NOT EXISTS idx_conversation_messages_slack_ts
  ON conversation_messages(slack_message_ts)
  WHERE slack_message_ts IS NOT NULL;

-- ============================================================================
-- ANALYZE TABLES
-- ============================================================================

-- Update statistics for query planner
ANALYZE workspaces;
ANALYZE oauth_tokens;
ANALYZE minno_sessions;
ANALYZE conversation_messages;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- To rollback this migration, run the following:
--
-- DROP INDEX IF EXISTS idx_workspaces_slack_team_id;
-- DROP INDEX IF EXISTS idx_oauth_tokens_workspace_provider;
-- DROP INDEX IF EXISTS idx_oauth_tokens_provider;
-- DROP INDEX IF EXISTS idx_minno_sessions_workspace_status;
-- DROP INDEX IF EXISTS idx_minno_sessions_slack_thread;
-- DROP INDEX IF EXISTS idx_minno_sessions_notion_project;
-- DROP INDEX IF EXISTS idx_minno_sessions_notion_task;
-- DROP INDEX IF EXISTS idx_minno_sessions_created_at;
-- DROP INDEX IF EXISTS idx_conversation_messages_session_timestamp;
-- DROP INDEX IF EXISTS idx_conversation_messages_slack_ts;
