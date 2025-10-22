# Minno Server

Express.js server for Minno's Slack and Notion integration, designed for deployment on Sevalla.

## Overview

Minno Server provides:
- Slack Events API integration for real-time message handling
- Multi-provider OAuth flow (Slack, Notion)
- PostgreSQL session storage
- Integration with Cyrus Edge Worker for AI processing
- Webhook endpoints for Slack interactivity

## Architecture

```
minno-server/
├── src/
│   ├── index.ts              # Server entry point
│   ├── app.ts                # Express app configuration
│   ├── config.ts             # Environment configuration
│   ├── routes/
│   │   ├── index.ts          # Route aggregator
│   │   ├── slack.ts          # Slack Events & Interactive endpoints
│   │   ├── oauth.ts          # Multi-provider OAuth
│   │   └── health.ts         # Health check endpoint
│   ├── services/
│   │   ├── SlackService.ts   # Slack API operations
│   │   ├── NotionService.ts  # Notion API operations (stub)
│   │   ├── OAuthService.ts   # OAuth token management
│   │   └── SessionService.ts # PostgreSQL session storage
│   ├── middleware/
│   │   ├── slackVerify.ts    # Slack signature verification
│   │   ├── errorHandler.ts   # Global error handling
│   │   └── requestLogger.ts  # Request logging
│   └── types/
│       └── index.ts          # Shared TypeScript types
└── README.md
```

## Prerequisites

- Node.js 20+
- PostgreSQL database
- Slack App with OAuth credentials
- (Optional) Notion integration credentials
- Anthropic API key

## Installation

```bash
# Install dependencies from monorepo root
pnpm install

# Or install locally
cd apps/minno-server
pnpm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/minno

# Slack
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret

# Notion (optional)
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Development

```bash
# Development mode with hot reload
pnpm dev

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Build for production
pnpm build

# Start production server
pnpm start
```

## Database Setup

The application automatically creates required tables on startup:

- `sessions` - Conversation session tracking
- `oauth_tokens` - OAuth token storage

To manually initialize:

```typescript
import { SessionService } from './services/SessionService';
const sessionService = new SessionService();
await sessionService.initialize();
```

## API Endpoints

### Health Check
```
GET /health
```

Returns server status.

### Slack Events
```
POST /slack/events
```

Receives Slack Events API callbacks:
- URL verification challenges
- Message events
- App mentions
- Other workspace events

Protected by Slack signature verification.

### Slack Interactive
```
POST /slack/interactive
```

Handles Slack interactive components:
- Button clicks
- Modal submissions
- Select menu interactions

Protected by Slack signature verification.

### OAuth Installation
```
GET /oauth/:provider/install
```

Initiates OAuth flow for specified provider (slack, notion).

Optional query parameter:
- `state` - Custom state for OAuth flow

### OAuth Callback
```
GET /oauth/:provider/callback
```

Handles OAuth callback after user authorization.

Query parameters:
- `code` - Authorization code
- `state` - State from installation request
- `error` - Error description if authorization failed

## Slack App Configuration

Configure your Slack App with these endpoints:

### Event Subscriptions
- **Request URL**: `https://your-domain.com/slack/events`
- **Subscribe to bot events**:
  - `app_mention`
  - `message.channels`
  - `message.im`

### Interactivity & Shortcuts
- **Request URL**: `https://your-domain.com/slack/interactive`

### OAuth & Permissions
- **Redirect URL**: `https://your-domain.com/oauth/slack/callback`
- **Bot Token Scopes**:
  - `app_mentions:read`
  - `channels:history`
  - `channels:read`
  - `chat:write`
  - `commands`
  - `reactions:write`
  - `users:read`

## Deployment

### Sevalla Deployment

1. **Database Setup**:
   ```bash
   # Create PostgreSQL database on Sevalla
   # Note the connection string
   ```

2. **Environment Variables**:
   Set all required environment variables in Sevalla dashboard.

3. **Deploy**:
   ```bash
   # Build application
   pnpm build

   # Deploy to Sevalla
   # Follow Sevalla's Node.js deployment guide
   ```

4. **Post-Deployment**:
   - Test health endpoint: `https://your-domain.com/health`
   - Configure Slack Event Subscriptions URL
   - Complete OAuth installation flow

### Docker Deployment (Alternative)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

## Services

### SlackService

Handles Slack API operations:
- Send/update messages
- Add reactions
- Get user/channel info
- Retrieve thread messages

```typescript
import { SlackService } from './services/SlackService';

const slackService = new SlackService(botToken);
await slackService.sendMessage(channel, 'Hello!');
```

### NotionService

Notion API operations (stub implementation):
- Create/update pages
- Query databases
- Search workspace

### OAuthService

Multi-provider OAuth management:
- Generate authorization URLs
- Handle OAuth callbacks
- Token refresh/revocation

### SessionService

PostgreSQL-backed session storage:
- Create/retrieve sessions
- Store OAuth tokens
- Manage conversation context

## Security

- **Slack Signature Verification**: All Slack endpoints verify request signatures
- **HTTPS Required**: Use HTTPS in production
- **Environment Variables**: Never commit secrets to git
- **Database Security**: Use SSL for database connections in production
- **Helmet**: Security headers via helmet middleware

## Error Handling

Global error handler catches all errors and returns consistent responses:

```json
{
  "error": "Internal Server Error",
  "message": "Error description (dev only)"
}
```

## Logging

- Request logging via Morgan (combined format)
- Custom request logger middleware
- Console logging for debugging

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test

# Run once
pnpm test:run
```

## Integration with Cyrus Packages

This server integrates with:
- `cyrus-slack-client` - Slack API client
- `cyrus-edge-worker` - AI processing
- `cyrus-core` - Shared types and utilities

## Troubleshooting

### Slack URL Verification Fails
- Ensure `SLACK_SIGNING_SECRET` is correct
- Check server is publicly accessible
- Verify request body parsing is enabled

### Database Connection Issues
- Verify `DATABASE_URL` format
- Check PostgreSQL is running
- Ensure database exists
- Check SSL settings for production

### OAuth Flow Errors
- Verify redirect URLs match Slack/Notion app configuration
- Check client ID and secret are correct
- Ensure state parameter is preserved

## Future Enhancements

- [ ] Implement Notion integration
- [ ] Add EdgeWorker integration for AI processing
- [ ] Implement conversation threading
- [ ] Add Redis for caching
- [ ] Implement rate limiting
- [ ] Add metrics and monitoring
- [ ] WebSocket support for real-time updates

## License

ISC
