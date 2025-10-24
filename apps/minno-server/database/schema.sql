-- Minno Database Schema
-- PostgreSQL 14+
-- Complete database schema for Minno project management system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- WORKSPACES TABLE
-- ============================================================================
-- Stores workspace information for each Slack team using Minno
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_team_id VARCHAR(255) UNIQUE NOT NULL,  -- Slack workspace identifier
  slack_team_name VARCHAR(255) NOT NULL,        -- Human-readable workspace name
  notion_workspace_id VARCHAR(255),             -- Optional Notion workspace link
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE workspaces IS 'Stores workspace information for each Slack team using Minno';
COMMENT ON COLUMN workspaces.slack_team_id IS 'Unique Slack workspace identifier (e.g., T1234567890)';
COMMENT ON COLUMN workspaces.slack_team_name IS 'Human-readable Slack workspace name';
COMMENT ON COLUMN workspaces.notion_workspace_id IS 'Optional linked Notion workspace identifier';

-- ============================================================================
-- OAUTH_TOKENS TABLE
-- ============================================================================
-- Stores encrypted OAuth tokens for various service providers
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,                -- 'slack', 'notion', 'google', etc.
  access_token_encrypted TEXT NOT NULL,         -- Base64-encoded encrypted access token
  refresh_token_encrypted TEXT,                 -- Base64-encoded encrypted refresh token (if applicable)
  expires_at TIMESTAMP,                         -- Token expiration timestamp (NULL if no expiration)
  scopes TEXT[],                                -- Array of OAuth scopes granted
  metadata JSONB,                               -- Provider-specific metadata (bot_user_id, team_id, etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_workspace_provider UNIQUE(workspace_id, provider)
);

COMMENT ON TABLE oauth_tokens IS 'Stores encrypted OAuth tokens for various service providers';
COMMENT ON COLUMN oauth_tokens.provider IS 'Service provider name: slack, notion, google, etc.';
COMMENT ON COLUMN oauth_tokens.access_token_encrypted IS 'Base64-encoded encrypted access token';
COMMENT ON COLUMN oauth_tokens.refresh_token_encrypted IS 'Base64-encoded encrypted refresh token (optional)';
COMMENT ON COLUMN oauth_tokens.scopes IS 'Array of OAuth scopes granted to the token';
COMMENT ON COLUMN oauth_tokens.metadata IS 'Provider-specific metadata (e.g., bot_user_id, team_id, user_id)';

-- ============================================================================
-- MINNO_SESSIONS TABLE
-- ============================================================================
-- Tracks conversation sessions between Slack threads and Notion tasks
CREATE TABLE IF NOT EXISTS minno_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slack_channel_id VARCHAR(255) NOT NULL,       -- Slack channel where conversation occurs
  slack_thread_ts VARCHAR(255) NOT NULL,        -- Slack thread timestamp (unique per channel)
  notion_project_id VARCHAR(255),               -- Associated Notion project/database ID
  notion_task_id VARCHAR(255),                  -- Associated Notion task/page ID
  context JSONB,                                -- Session context (history, state, metadata)
  status VARCHAR(50) DEFAULT 'active',          -- 'active', 'completed', 'failed', 'archived'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_slack_thread UNIQUE(slack_channel_id, slack_thread_ts)
);

COMMENT ON TABLE minno_sessions IS 'Tracks conversation sessions between Slack threads and Notion tasks';
COMMENT ON COLUMN minno_sessions.slack_channel_id IS 'Slack channel ID where conversation occurs (e.g., C1234567890)';
COMMENT ON COLUMN minno_sessions.slack_thread_ts IS 'Slack thread timestamp - unique identifier for thread within channel';
COMMENT ON COLUMN minno_sessions.notion_project_id IS 'Associated Notion project/database ID';
COMMENT ON COLUMN minno_sessions.notion_task_id IS 'Associated Notion task/page ID created for this session';
COMMENT ON COLUMN minno_sessions.context IS 'Session context including conversation history, state, and metadata';
COMMENT ON COLUMN minno_sessions.status IS 'Session status: active, completed, failed, or archived';

-- ============================================================================
-- CONVERSATION_MESSAGES TABLE
-- ============================================================================
-- Stores individual messages within conversation sessions
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES minno_sessions(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,                    -- 'user', 'assistant', 'tool', 'system'
  content TEXT NOT NULL,                        -- Message content (can be Markdown)
  metadata JSONB,                               -- Message metadata (Slack blocks, attachments, tool results, etc.)
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  slack_message_ts VARCHAR(255)                 -- Reference to original Slack message timestamp
);

COMMENT ON TABLE conversation_messages IS 'Stores individual messages within conversation sessions';
COMMENT ON COLUMN conversation_messages.role IS 'Message role: user, assistant, tool, or system';
COMMENT ON COLUMN conversation_messages.content IS 'Message content (plain text or Markdown)';
COMMENT ON COLUMN conversation_messages.metadata IS 'Message metadata including Slack blocks, attachments, tool results, etc.';
COMMENT ON COLUMN conversation_messages.slack_message_ts IS 'Reference to original Slack message timestamp for linking';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Workspace indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_slack_team_id ON workspaces(slack_team_id);

-- OAuth tokens indexes
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_workspace_provider ON oauth_tokens(workspace_id, provider);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens(provider);

-- Minno sessions indexes
CREATE INDEX IF NOT EXISTS idx_minno_sessions_workspace_status ON minno_sessions(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_minno_sessions_slack_thread ON minno_sessions(slack_channel_id, slack_thread_ts);
CREATE INDEX IF NOT EXISTS idx_minno_sessions_notion_project ON minno_sessions(notion_project_id) WHERE notion_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_minno_sessions_notion_task ON minno_sessions(notion_task_id) WHERE notion_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_minno_sessions_created_at ON minno_sessions(created_at DESC);

-- Conversation messages indexes
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_timestamp ON conversation_messages(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_slack_ts ON conversation_messages(slack_message_ts) WHERE slack_message_ts IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for workspaces table
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for oauth_tokens table
DROP TRIGGER IF EXISTS update_oauth_tokens_updated_at ON oauth_tokens;
CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for minno_sessions table
DROP TRIGGER IF EXISTS update_minno_sessions_updated_at ON minno_sessions;
CREATE TRIGGER update_minno_sessions_updated_at
  BEFORE UPDATE ON minno_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View to get active sessions with workspace info
CREATE OR REPLACE VIEW active_sessions_view AS
SELECT
  s.id AS session_id,
  s.slack_channel_id,
  s.slack_thread_ts,
  s.notion_project_id,
  s.notion_task_id,
  s.status,
  s.created_at,
  s.updated_at,
  w.id AS workspace_id,
  w.slack_team_id,
  w.slack_team_name,
  w.notion_workspace_id
FROM minno_sessions s
JOIN workspaces w ON s.workspace_id = w.id
WHERE s.status = 'active';

COMMENT ON VIEW active_sessions_view IS 'Active sessions with workspace information for easy querying';
