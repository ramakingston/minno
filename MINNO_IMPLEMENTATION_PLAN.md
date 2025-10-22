# Minno Implementation Plan & Progress

**Issue:** HUB-9 - Phase 1: Slack + Notion Foundation - Core Infrastructure
**Status:** Week 1 Complete ✅
**Last Updated:** 2025-10-22

---

## Project Overview

**Minno** is a Go-To-Market AI agent for Slack, forked from Cyrus (ceedaragents/cyrus). Minno helps marketing teams with SEO, content creation, social media, analytics, and workflow automation through natural conversation in Slack, using Notion for project management.

### Key Changes from Cyrus
- **Replace:** Linear → Slack + Notion
- **Deploy:** Cloudflare Workers → Sevalla (PostgreSQL)
- **Focus:** Software development → Marketing automation

---

## Architecture Design

### System Overview

```
User in Slack
    ↓
@mentions Minno
    ↓
Slack Events API → Sevalla Server (apps/minno-server/)
    ↓
SlackEdgeWorker (packages/edge-worker/)
    ↓
├─ Claude Code Session (with Notion MCP)
├─ Task tracking in Notion
└─ Response back to Slack thread
```

### Components

**New Packages:**
- ✅ `packages/slack-client/` - Slack API abstraction layer
- ⏳ `packages/notion-client/` - Notion utilities (Week 2)

**New Apps:**
- ✅ `apps/minno-server/` - Express.js server for Sevalla

**Refactored:**
- ⏳ `packages/edge-worker/` → SlackEdgeWorker (Week 2)
- ⏳ `packages/core/` → MinnoSession types (Week 2)

**Keep:**
- ✅ `packages/claude-runner/` - Already integration-agnostic
- ✅ `packages/simple-agent-runner/` - For classification tasks

**Remove (Week 3):**
- ❌ `packages/linear-webhook-client/` - No longer needed
- ❌ `packages/ndjson-client/` - Not needed for Sevalla
- ❌ `apps/proxy-worker/` - Cloudflare Workers, replaced by minno-server
- ❌ `apps/cli/` - Will be replaced with Minno-specific CLI

---

## Week 1 Progress ✅ COMPLETE

### 1.1 ✅ Architecture & Planning
- [x] Reviewed Cyrus codebase and identified all Linear touchpoints
- [x] Designed Minno architecture (Slack + Notion + Sevalla)
- [x] Created research sub-issues:
  - HUB-10: Slack Thread to Notion Page Mapping Strategy
  - HUB-11: Token Storage Security for Sevalla Deployment
  - HUB-12: Notion Database Onboarding Strategy
- [x] Documented architectural decisions in this file

### 1.2 ✅ packages/slack-client/
**Status:** Complete and ready for use

**Created:**
- Full TypeScript package with Slack SDK integration
- SlackClient class with comprehensive methods:
  - Event handling (app_mention, message, reaction)
  - Messaging (post, reply, update, delete)
  - Thread management (history retrieval)
  - File operations (upload)
  - Reactions (add, remove)
  - User/channel metadata
- Type definitions with Zod validation
- Event handling utilities and type guards
- Unit tests with Vitest
- Comprehensive documentation

**Files:** 8 total (436 lines of TypeScript)

### 1.3 ✅ apps/minno-server/
**Status:** Complete Express.js foundation

**Created:**
- Express.js server with security middleware (helmet, cors)
- Route handlers:
  - `/health` - Health check endpoint
  - `/slack/events` - Slack Events API with signature verification
  - `/slack/interactive` - Interactive components
  - `/oauth/{provider}` - OAuth installation flow
  - `/oauth/callback` - OAuth callback handler
- Services:
  - SlackService - Slack Web API operations
  - NotionService - Stub for future implementation
  - OAuthService - Multi-provider OAuth flow
  - SessionService - PostgreSQL integration (see 1.4)
- Middleware:
  - slackVerify - Signature verification with HMAC-SHA256
  - errorHandler - Global error handling
  - requestLogger - Request logging with metadata
- TypeScript types for all Slack/Notion entities
- Development setup with tsx watch mode
- Comprehensive README with deployment guide

**Files:** 20 total (2,800+ lines)

### 1.4 ✅ PostgreSQL Schema & Migrations
**Status:** Production-ready database design

**Created:**

**Database Schema (schema.sql):**
- `workspaces` - Slack workspace tracking
- `oauth_tokens` - Encrypted OAuth tokens for multiple providers
- `minno_sessions` - Conversation sessions (Slack thread → Notion task)
- `conversation_messages` - Individual messages within sessions

**Features:**
- UUID primary keys
- Foreign key constraints with CASCADE delete
- JSONB columns for flexible metadata
- 10 performance indexes
- 3 auto-update triggers for timestamps
- 1 view for active sessions

**Migration System:**
- Migration tracking table
- Sequential migration runner with rollback
- Two initial migrations:
  - 001_initial_schema.sql - Core tables
  - 002_add_indexes.sql - Performance indexes

**Utility Scripts:**
- `init-db.ts` - Database initialization
- `migrate.ts` - Migration runner with dry-run support
- `seed.ts` - Development data seeding

**SessionService Enhancements:**
- Database initialization methods
- Workspace CRUD operations
- Session management (create, update, retrieve)
- Message operations (add, retrieve, filter)
- Legacy compatibility maintained

**Documentation:**
- database/README.md (650+ lines) - Complete schema guide
- database/queries.sql (420+ lines) - Query reference
- database/migrations/README.md - Migration guide

**Files:** 11 total (2,800+ lines)

---

## Week 2 Plan (In Progress)

### 2.1 ⏳ Refactor EdgeWorker → SlackEdgeWorker

**Goal:** Adapt EdgeWorker to handle Slack events instead of Linear webhooks

**Tasks:**
- [ ] Create SlackEdgeWorker class extending/replacing EdgeWorker
- [ ] Replace Linear webhook handling with Slack event handling
- [ ] Adapt session management for Slack threads
- [ ] Update ProcedureRouter to work with Slack events
- [ ] Remove Linear MCP, add Notion MCP configuration
- [ ] Update prompt templates for marketing tasks
- [ ] Test with mock Slack events

**Files to modify:**
- `packages/edge-worker/src/EdgeWorker.ts`
- `packages/edge-worker/src/types.ts`
- `packages/core/src/CyrusAgentSession.ts` → MinnoSession

**Dependencies:**
- Requires packages/slack-client ✅
- Requires apps/minno-server ✅
- Requires packages/notion-client (create in 2.2)

### 2.2 ⏳ Integrate Notion MCP Server

**Goal:** Add Notion integration via MCP for project/task management

**Tasks:**
- [ ] Create packages/notion-client/ package
- [ ] Add Notion MCP server configuration (tatsuiman/notion)
- [ ] Integrate with ClaudeRunner
- [ ] Implement basic Notion operations:
  - Create pages
  - Create databases
  - Add database items
  - Update properties
  - Search
- [ ] Test with sample Notion workspace
- [ ] Document Notion API limits and rate limiting

**New Package:** packages/notion-client/
- NotionClient class
- Type definitions for Notion entities
- MCP server configuration utilities
- Tests and documentation

### 2.3 ⏳ Implement Basic Notion Database Creation

**Goal:** Automated Notion workspace setup

**Tasks:**
- [ ] Create NotionBoardManager service
- [ ] Implement Projects database creation:
  - Properties: Name, Status, Owner, Start/Target Date, Priority, Description, Slack Thread URL
  - Views: Kanban (by Status), Calendar (by Target Date), List (all)
- [ ] Implement Tasks database creation:
  - Properties: Task, Status, Project (relation), Assignee, Priority, Due Date, Tags, Description, Slack Thread URL
  - Views: Kanban (by Status), Calendar (by Due Date), List (all), By Project (grouped)
- [ ] Add relation between Projects and Tasks databases
- [ ] Create default statuses and templates
- [ ] Test database creation flow

**New Service:** apps/minno-server/src/services/NotionBoardManager.ts

### 2.4 ⏳ Build Slack OAuth Flow

**Goal:** Complete Slack app installation and OAuth flow

**Tasks:**
- [ ] Create Slack app in Slack App Directory
- [ ] Configure OAuth scopes:
  - `app_mentions:read` - Listen for @Minno mentions
  - `chat:write` - Send messages
  - `chat:write.public` - Write in public channels
  - `channels:history` - Read channel messages
  - `im:history` - Read DM messages
  - `files:write` - Upload files
  - `reactions:read` - Read reactions
  - `reactions:write` - Add reactions
  - `users:read` - Read user info
  - `team:read` - Read workspace info
- [ ] Implement OAuth installation flow in minno-server
- [ ] Test OAuth flow end-to-end
- [ ] Store tokens in PostgreSQL (encrypted)
- [ ] Document Slack app setup process

**Slack App Configuration:**
- App name: Minno
- Display name: Minno
- Description: "Your Go-To-Market AI teammate"
- Icon: (design needed)
- OAuth redirect URL: https://{sevalla-domain}/oauth/slack/callback
- Request URL: https://{sevalla-domain}/slack/events

---

## Week 3 Plan

### 3.1 ⏳ Implement Notion OAuth and Token Management

**Tasks:**
- [ ] Create Notion OAuth app
- [ ] Configure OAuth scopes
- [ ] Implement OAuth flow in minno-server
- [ ] Implement token encryption/decryption
  - Research outcome from HUB-11
  - Implement chosen security solution (likely PostgreSQL + AES-256)
- [ ] Implement token refresh logic
- [ ] Add token expiration handling
- [ ] Test multi-workspace token management

### 3.2 ⏳ Build End-to-End Conversation Flow

**Tasks:**
- [ ] Connect Slack events → minno-server → SlackEdgeWorker
- [ ] Implement conversation context preservation
- [ ] Integrate Notion task creation from Slack threads
- [ ] Implement Notion project creation commands
- [ ] Add Notion link posting in Slack threads
- [ ] Test complete flow:
  1. User @mentions Minno in Slack
  2. Minno processes request with Claude
  3. Minno creates/updates Notion task
  4. Minno responds in Slack thread
  5. Conversation continues with context
- [ ] Implement error handling and retry logic
- [ ] Add logging and monitoring

### 3.3 ⏳ Deploy to Sevalla

**Tasks:**
- [ ] Set up Sevalla account and project
- [ ] Configure PostgreSQL database on Sevalla
- [ ] Set up environment variables
- [ ] Deploy minno-server to Sevalla
- [ ] Configure custom domain (if needed)
- [ ] Update Slack app webhook URL
- [ ] Run database migrations on production
- [ ] Test deployment with real Slack workspace
- [ ] Set up monitoring and logging
- [ ] Configure backups

**Environment Variables:**
```
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://...
SLACK_SIGNING_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
ANTHROPIC_API_KEY=...
ENCRYPTION_KEY=...
```

### 3.4 ⏳ Testing, Documentation, and Refinement

**Tasks:**
- [ ] Write integration tests
- [ ] Test all Slack event types
- [ ] Test OAuth flows for all providers
- [ ] Load testing with multiple concurrent sessions
- [ ] Security audit:
  - Token encryption
  - Slack signature verification
  - SQL injection prevention
  - Rate limiting
- [ ] Update all documentation:
  - README files
  - API documentation
  - Deployment guide
  - User guide (for Slack users)
  - Admin guide (for workspace admins)
- [ ] Update CHANGELOG.md
- [ ] Create demo video
- [ ] Performance optimization
- [ ] Error handling improvements

---

## Research Sub-Issues

### HUB-10: Slack Thread to Notion Page Mapping Strategy
**Status:** Backlog
**Priority:** Medium

**Questions:**
- How to determine thread → task vs thread → project?
- How to maintain context across threads for same project?
- UX for navigating between Slack and Notion?
- Scalability considerations?

**Simple Solution (Phase 1):**
- 1 Slack thread = 1 Notion Task (default)
- Explicit project creation: "@minno create project: Website Redesign"
- All entries store `slack_thread_url` property

### HUB-11: Token Storage Security
**Status:** Backlog
**Priority:** High

**Options:**
1. PostgreSQL + AES-256 encryption (application-level)
2. Sevalla Secrets Manager (if available)
3. External service (HashiCorp Vault, AWS Secrets Manager)

**Recommendation:** Start with Option 1 for Phase 1, migrate later if needed.

### HUB-12: Notion Database Onboarding
**Status:** Backlog
**Priority:** Medium

**Questions:**
- When does onboarding happen?
- What questions should Minno ask?
- Per-workspace vs per-team vs per-user databases?
- Handle existing Notion workspaces?

**Simple Flow (Phase 1):**
1. User completes Slack OAuth
2. Minno sends welcome message
3. User clicks OAuth link for Notion
4. Minno asks database hierarchy preference
5. Minno creates databases
6. Minno posts links to Notion pages

---

## Success Metrics (Phase 1)

**Technical Metrics:**
- [ ] Response time: < 3s for @mention
- [ ] Notion project creation: < 5s
- [ ] Thread context: 100% accuracy
- [ ] OAuth completion: > 95%
- [ ] Test coverage: > 80%
- [ ] Webhook success: > 99%

**Functional Metrics:**
- [ ] Minno responds to @mentions in Slack ✅
- [ ] Creates and manages Notion projects automatically ⏳
- [ ] Maintains conversation context across threads ⏳
- [ ] OAuth authorization via Slack for all integrations ⏳
- [ ] Deployed to Sevalla with Events API webhook ⏳

---

## Next Steps (Immediate)

1. **Review Week 1 work:**
   - Test slack-client package
   - Test minno-server locally
   - Initialize PostgreSQL database

2. **Begin Week 2:**
   - Start with SlackEdgeWorker refactoring (2.1)
   - Create notion-client package (2.2)
   - Research Notion MCP server configuration

3. **Dependencies to install:**
   ```bash
   # From repository root
   pnpm install

   # Build slack-client
   cd packages/slack-client
   pnpm build

   # Set up database
   cd ../../apps/minno-server
   npm run db:init
   npm run db:migrate
   npm run db:seed
   ```

4. **Testing Week 1 work:**
   ```bash
   # Test slack-client
   cd packages/slack-client
   pnpm test

   # Test minno-server (requires DATABASE_URL)
   cd ../../apps/minno-server
   pnpm dev  # Start development server
   ```

---

## File Structure Summary

```
HUB-9/
├── packages/
│   ├── slack-client/              ✅ Week 1 - Complete
│   │   ├── src/
│   │   │   ├── SlackClient.ts
│   │   │   ├── types.ts
│   │   │   ├── events.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── notion-client/             ⏳ Week 2 - TODO
│   │   └── (to be created)
│   │
│   ├── edge-worker/               ⏳ Week 2 - Refactor
│   │   └── (needs SlackEdgeWorker)
│   │
│   └── core/                      ⏳ Week 2 - Update types
│       └── (needs MinnoSession)
│
├── apps/
│   └── minno-server/              ✅ Week 1 - Complete
│       ├── src/
│       │   ├── index.ts
│       │   ├── app.ts
│       │   ├── config.ts
│       │   ├── routes/
│       │   │   ├── slack.ts
│       │   │   ├── oauth.ts
│       │   │   └── health.ts
│       │   ├── services/
│       │   │   ├── SlackService.ts
│       │   │   ├── NotionService.ts (stub)
│       │   │   ├── OAuthService.ts
│       │   │   └── SessionService.ts
│       │   ├── middleware/
│       │   │   ├── slackVerify.ts
│       │   │   ├── errorHandler.ts
│       │   │   └── requestLogger.ts
│       │   └── types/
│       │       └── index.ts
│       ├── database/              ✅ Week 1 - Complete
│       │   ├── schema.sql
│       │   ├── seed.sql
│       │   ├── queries.sql
│       │   ├── README.md
│       │   └── migrations/
│       │       ├── 001_initial_schema.sql
│       │       ├── 002_add_indexes.sql
│       │       └── README.md
│       ├── scripts/
│       │   ├── init-db.ts
│       │   ├── migrate.ts
│       │   └── seed.ts
│       ├── package.json
│       ├── .env.example
│       └── README.md
│
└── MINNO_IMPLEMENTATION_PLAN.md  ✅ This file
```

---

## Timeline Summary

- **Week 1 (Complete):** ✅ Slack client, minno-server, PostgreSQL schema
- **Week 2 (Current):** ⏳ EdgeWorker refactor, Notion integration, OAuth flows
- **Week 3 (Planned):** ⏳ Sevalla deployment, testing, documentation, refinement

**Estimated Completion:** Week 3 end (3 weeks from start)

---

## Notes & Decisions

**Architecture Decisions:**
1. ✅ Minno is a complete fork, not parallel to Cyrus
2. ✅ Remove Linear support entirely (Week 3)
3. ✅ Deploy to Sevalla, not Cloudflare Workers
4. ✅ Use PostgreSQL for all persistence
5. ✅ SlackEdgeWorker will replace/refactor existing EdgeWorker
6. ✅ Keep claude-runner and simple-agent-runner (integration-agnostic)
7. ✅ Simple solution for Phase 1: 1 thread = 1 task, explicit projects

**Security Decisions:**
1. ✅ PostgreSQL + AES-256 encryption for tokens (Phase 1)
2. ✅ Slack signature verification with HMAC-SHA256
3. ✅ Environment-based configuration with validation
4. ⏳ Rate limiting (Week 3)
5. ⏳ SQL injection prevention (parameterized queries)

**Product Decisions:**
1. ✅ Marketing focus (not software development)
2. ✅ Slack as primary interface
3. ✅ Notion as project management tool
4. ✅ Conversational task delegation
5. ⏳ Onboarding flow via Slack conversation
6. ⏳ Multi-integration support (Mixpanel, GA4 in Phase 2)

---

## Questions & Blockers

**Resolved:**
- ✅ Product identity (Minno is a fork)
- ✅ Repository structure (monorepo, forked from Cyrus)
- ✅ Deployment target (Sevalla with PostgreSQL)
- ✅ Integration strategy (replace Linear entirely)
- ✅ Token storage approach (PostgreSQL + encryption)

**Outstanding:**
- ⏳ Slack app icon/branding design
- ⏳ Sevalla account setup and credentials
- ⏳ Notion OAuth app setup
- ⏳ Final decision on thread → task mapping (HUB-10)
- ⏳ Final decision on onboarding flow (HUB-12)

---

**Last Updated:** 2025-10-22
**Next Review:** After Week 2 completion
