-- Migration: 001_initial_schema.sql
-- Description: Initial database schema for Minno project
-- Date: 2025-10-22
-- Author: Minno Team

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_team_id VARCHAR(255) UNIQUE NOT NULL,
  slack_team_name VARCHAR(255) NOT NULL,
  notion_workspace_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OAuth tokens table
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMP,
  scopes TEXT[],
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_workspace_provider UNIQUE(workspace_id, provider)
);

-- Minno sessions table
CREATE TABLE IF NOT EXISTS minno_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slack_channel_id VARCHAR(255) NOT NULL,
  slack_thread_ts VARCHAR(255) NOT NULL,
  notion_project_id VARCHAR(255),
  notion_task_id VARCHAR(255),
  context JSONB,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_slack_thread UNIQUE(slack_channel_id, slack_thread_ts)
);

-- Conversation messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES minno_sessions(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  slack_message_ts VARCHAR(255)
);

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at columns
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_minno_sessions_updated_at
  BEFORE UPDATE ON minno_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- To rollback this migration, run the following:
--
-- DROP TABLE IF EXISTS conversation_messages CASCADE;
-- DROP TABLE IF EXISTS minno_sessions CASCADE;
-- DROP TABLE IF EXISTS oauth_tokens CASCADE;
-- DROP TABLE IF EXISTS workspaces CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
-- DROP EXTENSION IF EXISTS "pgcrypto";
