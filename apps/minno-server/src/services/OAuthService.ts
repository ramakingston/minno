import { InstallProvider } from '@slack/oauth';
import { config } from '../config.js';
import { SessionService } from './SessionService.js';

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  botUserId?: string;
  teamId?: string;
}

export class OAuthService {
  private slackInstaller: InstallProvider;
  private sessionService: SessionService;

  constructor() {
    // Initialize Slack OAuth provider
    this.slackInstaller = new InstallProvider({
      clientId: config.slack.clientId,
      clientSecret: config.slack.clientSecret,
      stateSecret: config.slack.signingSecret,
    });

    this.sessionService = new SessionService();
  }

  /**
   * Generate OAuth authorization URL
   */
  async getAuthorizationUrl(provider: 'slack' | 'notion', state?: string): Promise<string> {
    if (provider === 'slack') {
      const url = await this.slackInstaller.generateInstallUrl({
        scopes: [
          'app_mentions:read',
          'channels:history',
          'channels:read',
          'chat:write',
          'commands',
          'reactions:write',
          'users:read',
        ],
        userScopes: [],
        metadata: state,
      });
      return url;
    }

    if (provider === 'notion') {
      // TODO: Implement Notion OAuth URL generation
      const notionAuthUrl = new URL('https://api.notion.com/v1/oauth/authorize');
      notionAuthUrl.searchParams.set('client_id', config.notion.clientId || '');
      notionAuthUrl.searchParams.set('response_type', 'code');
      notionAuthUrl.searchParams.set('owner', 'user');
      notionAuthUrl.searchParams.set('redirect_uri', `${process.env.BASE_URL}/oauth/notion/callback`);
      if (state) {
        notionAuthUrl.searchParams.set('state', state);
      }
      return notionAuthUrl.toString();
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(
    provider: 'slack' | 'notion',
    code: string,
    state?: string
  ): Promise<OAuthToken> {
    if (provider === 'slack') {
      const result = await this.slackInstaller.handleCallback(
        { code },
        { metadata: state }
      );

      const token: OAuthToken = {
        accessToken: result.botToken || '',
        teamId: result.team?.id,
        botUserId: result.botUserId,
        scope: result.botScopes?.join(','),
      };

      // Store token in database
      await this.sessionService.storeOAuthToken(provider, token.teamId || '', token);

      return token;
    }

    if (provider === 'notion') {
      // TODO: Implement Notion OAuth callback handling
      console.log('NotionOAuth.handleCallback called:', { code, state });
      throw new Error('Notion OAuth not implemented');
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  /**
   * Refresh OAuth token if needed
   */
  async refreshToken(provider: 'slack' | 'notion', tokenId: string): Promise<OAuthToken> {
    // TODO: Implement token refresh logic
    console.log('OAuthService.refreshToken called:', { provider, tokenId });
    throw new Error('Not implemented');
  }

  /**
   * Revoke OAuth token
   */
  async revokeToken(provider: 'slack' | 'notion', tokenId: string): Promise<void> {
    // TODO: Implement token revocation
    console.log('OAuthService.revokeToken called:', { provider, tokenId });
    throw new Error('Not implemented');
  }
}
