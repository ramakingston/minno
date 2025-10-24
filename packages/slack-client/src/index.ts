// Main exports
export { SlackClient } from "./SlackClient.js";

// Type exports
export type {
	Block,
	Message,
	SlackEvent,
	AppMentionEvent,
	MessageEvent,
	ReactionAddedEvent,
	SlackEventWrapper,
	SlackClientConfig,
	FileUploadOptions,
	ThreadHistoryOptions,
	PostMessageOptions,
} from "./types.js";

// Schema exports for validation
export {
	BlockSchema,
	MessageSchema,
	AppMentionEventSchema,
	MessageEventSchema,
	ReactionAddedEventSchema,
	SlackEventSchema,
	SlackEventWrapperSchema,
} from "./types.js";

// Event handling utilities
export {
	createSlackEventHandler,
	parseSlackEventWrapper,
	extractEvent,
	isAppMentionEvent,
	isMessageEvent,
	isReactionAddedEvent,
	isThreadMessage,
	isBotMessage,
	isUserMessage,
} from "./events.js";

export type { EventHandlerConfig, EventHandler } from "./events.js";
