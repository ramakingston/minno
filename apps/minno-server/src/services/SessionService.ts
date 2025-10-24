import pg from 'pg';
import { config } from '../config.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { OAuthToken } from './OAuthService.js';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Interfaces matching new schema
export interface Workspace {
  id: string;
  slackTeamId: string;
  slackTeamName: string;
  notionWorkspaceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MinnoSession {
  id: string;
  workspaceId: string;
  slackChannelId: string;
  slackThreadTs: string;
  notionProjectId?: string;
  notionTaskId?: string;
  context?: Record<string, unknown>;
  status: 'active' | 'completed' | 'failed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  slackMessageTs?: string;
}

// Legacy Session interface for backwards compatibility
export interface Session {
  id: string;
  threadId: string;
  workspaceId: string;
  provider: 'slack' | 'notion';
  context: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class SessionService {
  private pool: pg.Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.database.url,
      ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
    });
  }

  /**
   * Initialize database from schema.sql
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Read and execute schema.sql
      const schemaPath = join(__dirname, '..', '..', 'database', 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf-8');
      await client.query(schema);
      console.log('Database schema initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Create migrations table if not exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Get list of applied migrations
      const applied = await client.query('SELECT name FROM migrations');
      const appliedNames = new Set(applied.rows.map(r => r.name));

      // Read migration directory
      const migrationsDir = join(__dirname, '..', '..', 'database', 'migrations');
      const fs = await import('fs');
      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql') && /^\d{3}_/.test(f))
        .sort();

      // Run pending migrations
      for (const file of files) {
        if (!appliedNames.has(file)) {
          console.log(`Running migration: ${file}`);
          const migrationPath = join(migrationsDir, file);
          const migration = fs.readFileSync(migrationPath, 'utf-8');

          await client.query('BEGIN');
          try {
            await client.query(migration);
            await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
            await client.query('COMMIT');
            console.log(`Migration ${file} completed`);
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Error running migrations:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // WORKSPACE METHODS
  // ============================================================================

  /**
   * Create or update a workspace
   */
  async upsertWorkspace(
    slackTeamId: string,
    slackTeamName: string,
    notionWorkspaceId?: string
  ): Promise<Workspace> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO workspaces (slack_team_id, slack_team_name, notion_workspace_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (slack_team_id)
         DO UPDATE SET
           slack_team_name = $2,
           notion_workspace_id = COALESCE($3, workspaces.notion_workspace_id),
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [slackTeamId, slackTeamName, notionWorkspaceId]
      );
      return this.mapRowToWorkspace(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get workspace by Slack team ID
   */
  async getWorkspaceBySlackTeamId(slackTeamId: string): Promise<Workspace | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM workspaces WHERE slack_team_id = $1',
        [slackTeamId]
      );
      return result.rows.length > 0 ? this.mapRowToWorkspace(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Get workspace by ID
   */
  async getWorkspace(id: string): Promise<Workspace | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM workspaces WHERE id = $1',
        [id]
      );
      return result.rows.length > 0 ? this.mapRowToWorkspace(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // MINNO SESSION METHODS
  // ============================================================================

  /**
   * Create or update a Minno session
   */
  async upsertMinnoSession(
    workspaceId: string,
    slackChannelId: string,
    slackThreadTs: string,
    data?: {
      notionProjectId?: string;
      notionTaskId?: string;
      context?: Record<string, unknown>;
      status?: 'active' | 'completed' | 'failed' | 'archived';
    }
  ): Promise<MinnoSession> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO minno_sessions
         (workspace_id, slack_channel_id, slack_thread_ts, notion_project_id, notion_task_id, context, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slack_channel_id, slack_thread_ts)
         DO UPDATE SET
           notion_project_id = COALESCE($4, minno_sessions.notion_project_id),
           notion_task_id = COALESCE($5, minno_sessions.notion_task_id),
           context = COALESCE($6, minno_sessions.context),
           status = COALESCE($7, minno_sessions.status),
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          workspaceId,
          slackChannelId,
          slackThreadTs,
          data?.notionProjectId,
          data?.notionTaskId,
          data?.context ? JSON.stringify(data.context) : null,
          data?.status || 'active',
        ]
      );
      return this.mapRowToMinnoSession(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get session by Slack thread
   */
  async getMinnoSessionByThread(
    slackChannelId: string,
    slackThreadTs: string
  ): Promise<MinnoSession | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM minno_sessions WHERE slack_channel_id = $1 AND slack_thread_ts = $2',
        [slackChannelId, slackThreadTs]
      );
      return result.rows.length > 0 ? this.mapRowToMinnoSession(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Get active sessions for a workspace
   */
  async getActiveSessionsForWorkspace(workspaceId: string): Promise<MinnoSession[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM minno_sessions WHERE workspace_id = $1 AND status = $2 ORDER BY updated_at DESC',
        [workspaceId, 'active']
      );
      return result.rows.map(row => this.mapRowToMinnoSession(row));
    } finally {
      client.release();
    }
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    status: 'active' | 'completed' | 'failed' | 'archived'
  ): Promise<MinnoSession> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'UPDATE minno_sessions SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [sessionId, status]
      );
      if (result.rows.length === 0) {
        throw new Error('Session not found');
      }
      return this.mapRowToMinnoSession(result.rows[0]);
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // CONVERSATION MESSAGE METHODS
  // ============================================================================

  /**
   * Add a message to a conversation
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'tool' | 'system',
    content: string,
    metadata?: Record<string, unknown>,
    slackMessageTs?: string
  ): Promise<ConversationMessage> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO conversation_messages (session_id, role, content, metadata, slack_message_ts)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [sessionId, role, content, metadata ? JSON.stringify(metadata) : null, slackMessageTs]
      );
      return this.mapRowToMessage(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get all messages for a session
   */
  async getSessionMessages(sessionId: string): Promise<ConversationMessage[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM conversation_messages WHERE session_id = $1 ORDER BY timestamp ASC',
        [sessionId]
      );
      return result.rows.map(row => this.mapRowToMessage(row));
    } finally {
      client.release();
    }
  }

  /**
   * Get recent messages for a session
   */
  async getRecentMessages(sessionId: string, limit: number = 10): Promise<ConversationMessage[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM conversation_messages WHERE session_id = $1 ORDER BY timestamp DESC LIMIT $2',
        [sessionId, limit]
      );
      return result.rows.reverse().map(row => this.mapRowToMessage(row));
    } finally {
      client.release();
    }
  }

  /**
   * Create a new session
   */
  async createSession(
    threadId: string,
    workspaceId: string,
    provider: 'slack' | 'notion',
    context?: Record<string, unknown>
  ): Promise<Session> {
    const id = `${provider}-${workspaceId}-${threadId}`;
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `INSERT INTO sessions (id, thread_id, workspace_id, provider, context)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE
         SET updated_at = CURRENT_TIMESTAMP, context = $5
         RETURNING *`,
        [id, threadId, workspaceId, provider, JSON.stringify(context || {})]
      );

      return this.mapRowToSession(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get session by ID
   */
  async getSession(id: string): Promise<Session | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM sessions WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToSession(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Update session context
   */
  async updateSession(id: string, context: Record<string, unknown>): Promise<Session> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `UPDATE sessions
         SET context = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id, JSON.stringify(context)]
      );

      if (result.rows.length === 0) {
        throw new Error('Session not found');
      }

      return this.mapRowToSession(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Store OAuth token
   */
  async storeOAuthToken(provider: string, workspaceId: string, token: OAuthToken): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(
        `INSERT INTO oauth_tokens
         (provider, workspace_id, access_token, refresh_token, expires_at, scope, bot_user_id, team_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (provider, workspace_id)
         DO UPDATE SET
           access_token = $3,
           refresh_token = $4,
           expires_at = $5,
           scope = $6,
           bot_user_id = $7,
           team_id = $8,
           updated_at = CURRENT_TIMESTAMP`,
        [
          provider,
          workspaceId,
          token.accessToken,
          token.refreshToken || null,
          token.expiresAt || null,
          token.scope || null,
          token.botUserId || null,
          token.teamId || null,
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get OAuth token
   */
  async getOAuthToken(provider: string, workspaceId: string): Promise<OAuthToken | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM oauth_tokens WHERE provider = $1 AND workspace_id = $2',
        [provider, workspaceId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        accessToken: row.access_token,
        refreshToken: row.refresh_token,
        expiresAt: row.expires_at,
        scope: row.scope,
        botUserId: row.bot_user_id,
        teamId: row.team_id,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  // ============================================================================
  // MAPPER METHODS
  // ============================================================================

  private mapRowToWorkspace(row: unknown): Workspace {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      slackTeamId: r.slack_team_id as string,
      slackTeamName: r.slack_team_name as string,
      notionWorkspaceId: r.notion_workspace_id as string | undefined,
      createdAt: new Date(r.created_at as string),
      updatedAt: new Date(r.updated_at as string),
    };
  }

  private mapRowToMinnoSession(row: unknown): MinnoSession {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      workspaceId: r.workspace_id as string,
      slackChannelId: r.slack_channel_id as string,
      slackThreadTs: r.slack_thread_ts as string,
      notionProjectId: r.notion_project_id as string | undefined,
      notionTaskId: r.notion_task_id as string | undefined,
      context: (r.context as Record<string, unknown>) || undefined,
      status: r.status as 'active' | 'completed' | 'failed' | 'archived',
      createdAt: new Date(r.created_at as string),
      updatedAt: new Date(r.updated_at as string),
    };
  }

  private mapRowToMessage(row: unknown): ConversationMessage {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      sessionId: r.session_id as string,
      role: r.role as 'user' | 'assistant' | 'tool' | 'system',
      content: r.content as string,
      metadata: (r.metadata as Record<string, unknown>) || undefined,
      timestamp: new Date(r.timestamp as string),
      slackMessageTs: r.slack_message_ts as string | undefined,
    };
  }

  private mapRowToSession(row: unknown): Session {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      threadId: r.thread_id as string,
      workspaceId: r.workspace_id as string,
      provider: r.provider as 'slack' | 'notion',
      context: (r.context as Record<string, unknown>) || {},
      createdAt: new Date(r.created_at as string),
      updatedAt: new Date(r.updated_at as string),
    };
  }
}
