/**
 * Shared TypeScript types for Minno Server
 */

// Slack event types
export interface SlackEvent {
  type: string;
  event_ts: string;
  user?: string;
  channel?: string;
  text?: string;
  thread_ts?: string;
  ts?: string;
}

export interface SlackEventPayload {
  token: string;
  team_id: string;
  api_app_id: string;
  event: SlackEvent;
  type: string;
  event_id: string;
  event_time: number;
}

export interface SlackUrlVerification {
  type: 'url_verification';
  token: string;
  challenge: string;
}

export interface SlackInteractivePayload {
  type: string;
  user: {
    id: string;
    username: string;
    name: string;
  };
  team: {
    id: string;
    domain: string;
  };
  channel?: {
    id: string;
    name: string;
  };
  actions?: unknown[];
  callback_id?: string;
  trigger_id?: string;
  response_url?: string;
}

// Notion types (stubs)
export interface NotionUser {
  id: string;
  name?: string;
  avatar_url?: string;
  type: 'person' | 'bot';
}

export interface NotionWorkspace {
  id: string;
  name: string;
}

// Session types
export interface SessionContext {
  lastMessageId?: string;
  lastMessageTimestamp?: string;
  conversationHistory?: unknown[];
  metadata?: Record<string, unknown>;
}

// OAuth types
export interface OAuthState {
  provider: 'slack' | 'notion';
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Environment configuration
export interface Config {
  port: number | string;
  nodeEnv: string;
  slack: {
    signingSecret: string;
    clientId: string;
    clientSecret: string;
  };
  notion: {
    clientId?: string;
    clientSecret?: string;
  };
  database: {
    url: string;
  };
  anthropic: {
    apiKey: string;
  };
}
