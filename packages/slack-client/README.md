# cyrus-slack-client

A TypeScript client library for integrating with Slack's API, designed for use in the Cyrus (Linear Claude Agent) monorepo.

## Overview

This package provides a strongly-typed interface to Slack's Web API and Events API, with built-in validation using Zod schemas. It's designed to handle common Slack operations needed for bot applications.

## Features

- **Type-safe Slack API client** - Full TypeScript support with Zod validation
- **Event handling** - Process Slack Events API webhooks
- **Message operations** - Send, update, and delete messages
- **Thread management** - Reply to threads and retrieve thread history
- **File uploads** - Upload files to channels and threads
- **Reactions** - Add and remove reactions to messages
- **User/Channel info** - Retrieve user and channel metadata

## Installation

```bash
pnpm add cyrus-slack-client
```

## Usage

### Basic Setup

```typescript
import { SlackClient } from 'cyrus-slack-client';

const client = new SlackClient({
  token: 'xoxb-your-bot-token',
  signingSecret: 'your-signing-secret',
  logLevel: 'info',
});
```

### Posting Messages

```typescript
// Simple message
await client.postMessage('C123456', 'Hello, world!');

// Message with blocks
await client.postMessage('C123456', 'Hello!', {
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Bold* and _italic_ text',
      },
    },
  ],
});

// Reply to a thread
await client.postThreadReply(
  'C123456',
  '1234567890.123456',
  'Thread reply'
);
```

### Handling Events

```typescript
import {
  SlackClient,
  isAppMentionEvent,
  isMessageEvent
} from 'cyrus-slack-client';

const client = new SlackClient({ token: 'xoxb-...' });

// Handle events
async function handleSlackEvent(event: SlackEvent) {
  if (isAppMentionEvent(event)) {
    await client.postMessage(event.channel, 'You mentioned me!');
  } else if (isMessageEvent(event)) {
    console.log('Message received:', event.text);
  }
}
```

### Thread Management

```typescript
// Get full thread history
const messages = await client.getThreadHistory(
  'C123456',
  '1234567890.123456',
  { limit: 100 }
);

// Check if in thread
import { isThreadMessage } from 'cyrus-slack-client';

if (isMessageEvent(event) && isThreadMessage(event)) {
  console.log('This is a thread message');
}
```

### File Uploads

```typescript
const fileBuffer = Buffer.from('file content');

await client.uploadFile(fileBuffer, 'document.txt', {
  channels: 'C123456',
  initial_comment: 'Here is the file',
  thread_ts: '1234567890.123456', // Optional: upload to thread
});
```

### Reactions

```typescript
// Add a reaction
await client.addReaction('C123456', '1234567890.123456', 'thumbsup');

// Remove a reaction
await client.removeReaction('C123456', '1234567890.123456', 'thumbsup');
```

### User and Channel Info

```typescript
// Get user info
const user = await client.getUserInfo('U123456');
console.log(user.name);

// Get channel info
const channel = await client.getChannelInfo('C123456');
console.log(channel.name);
```

## API Reference

### SlackClient

Main client class for interacting with Slack.

#### Constructor

```typescript
new SlackClient(config: SlackClientConfig)
```

#### Methods

- `postMessage(channel, text, options?)` - Post a message to a channel
- `postThreadReply(channel, threadTs, text, blocks?)` - Reply to a thread
- `getThreadHistory(channel, threadTs, options?)` - Get thread messages
- `uploadFile(file, filename, options?)` - Upload a file
- `getUserInfo(userId)` - Get user information
- `getChannelInfo(channelId)` - Get channel information
- `addReaction(channel, timestamp, reaction)` - Add a reaction
- `removeReaction(channel, timestamp, reaction)` - Remove a reaction
- `updateMessage(channel, timestamp, text, blocks?)` - Update a message
- `deleteMessage(channel, timestamp)` - Delete a message
- `handleEvent(event)` - Handle incoming Slack events
- `getClient()` - Get the underlying WebClient for advanced usage

## Type Guards

The package includes type guards for discriminating between event types:

- `isAppMentionEvent(event)` - Check if event is an app mention
- `isMessageEvent(event)` - Check if event is a message
- `isReactionAddedEvent(event)` - Check if event is a reaction added
- `isThreadMessage(event)` - Check if message is in a thread
- `isBotMessage(event)` - Check if message is from a bot
- `isUserMessage(event)` - Check if message is from a user (not a bot)

## Zod Schemas

All types are validated using Zod schemas, which are also exported:

- `BlockSchema` - Slack Block Kit blocks
- `MessageSchema` - Slack messages
- `SlackEventSchema` - Slack events
- `SlackEventWrapperSchema` - Complete event payload from Events API

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Type checking
pnpm typecheck
```

## Integration with Cyrus

This package is designed to work seamlessly with other Cyrus packages:

- Use with `cyrus-core` for session management
- Integrate with `cyrus-edge-worker` for distributed processing
- Complement `cyrus-linear-client` for Linear+Slack workflows

## License

MIT
