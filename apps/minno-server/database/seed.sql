-- Minno Database Seed Data
-- Sample data for development and testing
-- WARNING: This should only be used in development environments!

-- ============================================================================
-- CLEAN EXISTING DATA (for re-seeding)
-- ============================================================================

-- Clean in reverse order of foreign key dependencies
DELETE FROM conversation_messages;
DELETE FROM minno_sessions;
DELETE FROM oauth_tokens;
DELETE FROM workspaces;

-- ============================================================================
-- SAMPLE WORKSPACES
-- ============================================================================

-- Sample workspace: Acme Corp
INSERT INTO workspaces (id, slack_team_id, slack_team_name, notion_workspace_id, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'T1234567890',
  'Acme Corp',
  'notion-workspace-1',
  CURRENT_TIMESTAMP - INTERVAL '30 days',
  CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- Sample workspace: Dev Team
INSERT INTO workspaces (id, slack_team_id, slack_team_name, notion_workspace_id, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'T9876543210',
  'Dev Team HQ',
  NULL,  -- No Notion workspace linked yet
  CURRENT_TIMESTAMP - INTERVAL '15 days',
  CURRENT_TIMESTAMP - INTERVAL '2 hours'
);

-- ============================================================================
-- SAMPLE OAUTH TOKENS
-- ============================================================================

-- Note: These are dummy encrypted values for development only!
-- In production, these would be actual encrypted tokens using your encryption service

-- Slack token for Acme Corp
INSERT INTO oauth_tokens (
  id,
  workspace_id,
  provider,
  access_token_encrypted,
  refresh_token_encrypted,
  expires_at,
  scopes,
  metadata,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'slack',
  'ENCRYPTED_FAKE_SLACK_BOT_TOKEN_FOR_TESTING_ONLY_BASE64',
  NULL,  -- Slack tokens don't typically have refresh tokens
  NULL,  -- Slack bot tokens don't expire
  ARRAY['chat:write', 'channels:history', 'channels:read', 'commands', 'im:history', 'users:read'],
  '{"bot_user_id": "U01234ABCDE", "team_id": "T1234567890", "team_name": "Acme Corp"}'::jsonb,
  CURRENT_TIMESTAMP - INTERVAL '30 days',
  CURRENT_TIMESTAMP - INTERVAL '30 days'
);

-- Notion token for Acme Corp
INSERT INTO oauth_tokens (
  id,
  workspace_id,
  provider,
  access_token_encrypted,
  refresh_token_encrypted,
  expires_at,
  scopes,
  metadata,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'notion',
  'ENCRYPTED_secret_abcdefghijklmnop1234567890_BASE64ENCODED',
  NULL,  -- Notion uses long-lived tokens
  NULL,  -- Notion tokens don't expire
  ARRAY['read_content', 'update_content', 'insert_content'],
  '{"workspace_id": "notion-workspace-1", "workspace_name": "Acme Notion", "owner_type": "workspace"}'::jsonb,
  CURRENT_TIMESTAMP - INTERVAL '25 days',
  CURRENT_TIMESTAMP - INTERVAL '25 days'
);

-- Slack token for Dev Team (no Notion yet)
INSERT INTO oauth_tokens (
  id,
  workspace_id,
  provider,
  access_token_encrypted,
  refresh_token_encrypted,
  expires_at,
  scopes,
  metadata,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'slack',
  'ENCRYPTED_FAKE_SLACK_BOT_TOKEN_FOR_DEV_TEAM_BASE64',
  NULL,
  NULL,
  ARRAY['chat:write', 'channels:history', 'channels:read', 'commands'],
  '{"bot_user_id": "U98765ZYXWV", "team_id": "T9876543210", "team_name": "Dev Team HQ"}'::jsonb,
  CURRENT_TIMESTAMP - INTERVAL '15 days',
  CURRENT_TIMESTAMP - INTERVAL '15 days'
);

-- ============================================================================
-- SAMPLE MINNO SESSIONS
-- ============================================================================

-- Active session: Feature planning discussion
INSERT INTO minno_sessions (
  id,
  workspace_id,
  slack_channel_id,
  slack_thread_ts,
  notion_project_id,
  notion_task_id,
  context,
  status,
  created_at,
  updated_at
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'C01234ABCDE',
  '1698765432.123456',
  'database-abc123',
  'page-def456',
  '{
    "title": "Plan Q4 roadmap features",
    "participants": ["U01234ABCDE", "U56789FGHIJ"],
    "notion_database": "Product Roadmap",
    "last_action": "created_task",
    "task_url": "https://notion.so/page-def456"
  }'::jsonb,
  'active',
  CURRENT_TIMESTAMP - INTERVAL '2 hours',
  CURRENT_TIMESTAMP - INTERVAL '5 minutes'
);

-- Completed session: Bug report
INSERT INTO minno_sessions (
  id,
  workspace_id,
  slack_channel_id,
  slack_thread_ts,
  notion_project_id,
  notion_task_id,
  context,
  status,
  created_at,
  updated_at
) VALUES (
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'C98765ZYXWV',
  '1698700000.654321',
  'database-abc123',
  'page-ghi789',
  '{
    "title": "Login button not responsive on mobile",
    "participants": ["U11111AAAAA"],
    "notion_database": "Bug Tracker",
    "last_action": "task_completed",
    "task_url": "https://notion.so/page-ghi789",
    "resolution": "Fixed in PR #456"
  }'::jsonb,
  'completed',
  CURRENT_TIMESTAMP - INTERVAL '3 days',
  CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- Active session: Dev Team (no Notion yet)
INSERT INTO minno_sessions (
  id,
  workspace_id,
  slack_channel_id,
  slack_thread_ts,
  notion_project_id,
  notion_task_id,
  context,
  status,
  created_at,
  updated_at
) VALUES (
  '20000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'C11111BBBBB',
  '1698800000.111111',
  NULL,
  NULL,
  '{
    "title": "Discuss API rate limiting strategy",
    "participants": ["U98765ZYXWV", "U22222CCCCC"],
    "awaiting_notion_setup": true,
    "last_action": "conversation_started"
  }'::jsonb,
  'active',
  CURRENT_TIMESTAMP - INTERVAL '30 minutes',
  CURRENT_TIMESTAMP - INTERVAL '2 minutes'
);

-- ============================================================================
-- SAMPLE CONVERSATION MESSAGES
-- ============================================================================

-- Messages for session 1 (Feature planning)
INSERT INTO conversation_messages (id, session_id, role, content, metadata, timestamp, slack_message_ts)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'user',
  'Hey Minno, can you help me plan out the Q4 roadmap features? I want to track them in Notion.',
  '{"slack_user_id": "U01234ABCDE", "slack_user_name": "alice"}'::jsonb,
  CURRENT_TIMESTAMP - INTERVAL '2 hours',
  '1698765432.123456'
);

INSERT INTO conversation_messages (id, session_id, role, content, metadata, timestamp, slack_message_ts)
VALUES (
  '30000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  'assistant',
  'I''d be happy to help! I''ll create a task in your Product Roadmap database. What are the key features you want to include?',
  '{"response_time_ms": 1250}'::jsonb,
  CURRENT_TIMESTAMP - INTERVAL '2 hours' + INTERVAL '5 seconds',
  '1698765437.123457'
);

INSERT INTO conversation_messages (id, session_id, role, content, metadata, timestamp, slack_message_ts)
VALUES (
  '30000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000001',
  'user',
  'We need: 1) Enhanced search functionality, 2) Dark mode, 3) Mobile app improvements',
  '{"slack_user_id": "U01234ABCDE", "slack_user_name": "alice"}'::jsonb,
  CURRENT_TIMESTAMP - INTERVAL '2 hours' + INTERVAL '30 seconds',
  '1698765462.123458'
);

INSERT INTO conversation_messages (id, session_id, role, content, metadata, timestamp, slack_message_ts)
VALUES (
  '30000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000001',
  'tool',
  'Created Notion page with ID: page-def456',
  '{"tool": "notion", "action": "create_page", "page_id": "page-def456", "page_url": "https://notion.so/page-def456"}'::jsonb,
  CURRENT_TIMESTAMP - INTERVAL '2 hours' + INTERVAL '35 seconds',
  NULL
);

INSERT INTO conversation_messages (id, session_id, role, content, metadata, timestamp, slack_message_ts)
VALUES (
  '30000000-0000-0000-0000-000000000005',
  '20000000-0000-0000-0000-000000000001',
  'assistant',
  'Perfect! I''ve created a task "Plan Q4 roadmap features" in your Product Roadmap with those three items listed. You can view it here: https://notion.so/page-def456',
  '{"response_time_ms": 2100, "notion_link": "https://notion.so/page-def456"}'::jsonb,
  CURRENT_TIMESTAMP - INTERVAL '2 hours' + INTERVAL '40 seconds',
  '1698765472.123459'
);

-- Messages for session 2 (Bug report - completed)
INSERT INTO conversation_messages (id, session_id, role, content, metadata, timestamp, slack_message_ts)
VALUES (
  '30000000-0000-0000-0000-000000000006',
  '20000000-0000-0000-0000-000000000002',
  'user',
  'The login button isn''t working on mobile devices. Can you create a bug report in Notion?',
  '{"slack_user_id": "U11111AAAAA", "slack_user_name": "bob"}'::jsonb,
  CURRENT_TIMESTAMP - INTERVAL '3 days',
  '1698700000.654321'
);

INSERT INTO conversation_messages (id, session_id, role, content, metadata, timestamp, slack_message_ts)
VALUES (
  '30000000-0000-0000-0000-000000000007',
  '20000000-0000-0000-0000-000000000002',
  'assistant',
  'I''ve created a bug report in your Bug Tracker: https://notion.so/page-ghi789. I''ve marked it as high priority. What device and browser are you seeing this on?',
  '{"response_time_ms": 1500, "notion_link": "https://notion.so/page-ghi789"}'::jsonb,
  CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '8 seconds',
  '1698700008.654322'
);

-- Messages for session 3 (Dev Team - no Notion)
INSERT INTO conversation_messages (id, session_id, role, content, metadata, timestamp, slack_message_ts)
VALUES (
  '30000000-0000-0000-0000-000000000008',
  '20000000-0000-0000-0000-000000000003',
  'user',
  'Minno, let''s discuss API rate limiting for our new service.',
  '{"slack_user_id": "U98765ZYXWV", "slack_user_name": "charlie"}'::jsonb,
  CURRENT_TIMESTAMP - INTERVAL '30 minutes',
  '1698800000.111111'
);

INSERT INTO conversation_messages (id, session_id, role, content, metadata, timestamp, slack_message_ts)
VALUES (
  '30000000-0000-0000-0000-000000000009',
  '20000000-0000-0000-0000-000000000003',
  'assistant',
  'I notice your workspace hasn''t connected to Notion yet. Would you like to track this discussion in Notion, or should I just help with the conversation here?',
  '{"response_time_ms": 900, "awaiting_notion_setup": true}'::jsonb,
  CURRENT_TIMESTAMP - INTERVAL '30 minutes' + INTERVAL '3 seconds',
  '1698800003.111112'
);

-- ============================================================================
-- VERIFY SEED DATA
-- ============================================================================

-- Show summary of seeded data
DO $$
DECLARE
  workspace_count INTEGER;
  token_count INTEGER;
  session_count INTEGER;
  message_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO workspace_count FROM workspaces;
  SELECT COUNT(*) INTO token_count FROM oauth_tokens;
  SELECT COUNT(*) INTO session_count FROM minno_sessions;
  SELECT COUNT(*) INTO message_count FROM conversation_messages;

  RAISE NOTICE 'Seed data loaded successfully:';
  RAISE NOTICE '  - % workspaces', workspace_count;
  RAISE NOTICE '  - % oauth tokens', token_count;
  RAISE NOTICE '  - % sessions', session_count;
  RAISE NOTICE '  - % messages', message_count;
END $$;

-- Show workspace summary
SELECT
  w.slack_team_name,
  COUNT(DISTINCT ot.id) as token_count,
  COUNT(DISTINCT ms.id) as session_count,
  COUNT(DISTINCT ms.id) FILTER (WHERE ms.status = 'active') as active_sessions
FROM workspaces w
LEFT JOIN oauth_tokens ot ON w.id = ot.workspace_id
LEFT JOIN minno_sessions ms ON w.id = ms.workspace_id
GROUP BY w.slack_team_name
ORDER BY w.slack_team_name;
