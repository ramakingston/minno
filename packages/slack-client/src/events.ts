import { createEventAdapter } from "@slack/events-api";
import { SlackEventWrapper, SlackEventWrapperSchema, SlackEvent } from "./types.js";

export interface EventHandlerConfig {
	signingSecret: string;
	includeBody?: boolean;
	includeHeaders?: boolean;
	waitForResponse?: boolean;
}

export type EventHandler = (event: SlackEvent) => Promise<void> | void;

/**
 * Create a Slack Events API adapter
 */
export function createSlackEventHandler(config: EventHandlerConfig) {
	const adapter = createEventAdapter(config.signingSecret, {
		includeBody: config.includeBody,
		includeHeaders: config.includeHeaders,
		waitForResponse: config.waitForResponse,
	});

	return adapter;
}

/**
 * Validate and parse a Slack event wrapper
 */
export function parseSlackEventWrapper(body: unknown): SlackEventWrapper {
	return SlackEventWrapperSchema.parse(body);
}

/**
 * Extract the event from a Slack event wrapper
 */
export function extractEvent(wrapper: SlackEventWrapper): SlackEvent {
	return wrapper.event;
}

/**
 * Event type guards for discriminating between event types
 */
export function isAppMentionEvent(event: SlackEvent): event is Extract<SlackEvent, { type: "app_mention" }> {
	return event.type === "app_mention";
}

export function isMessageEvent(event: SlackEvent): event is Extract<SlackEvent, { type: "message" }> {
	return event.type === "message";
}

export function isReactionAddedEvent(event: SlackEvent): event is Extract<SlackEvent, { type: "reaction_added" }> {
	return event.type === "reaction_added";
}

/**
 * Check if a message event is in a thread
 */
export function isThreadMessage(event: Extract<SlackEvent, { type: "message" }>): boolean {
	return event.thread_ts !== undefined && event.thread_ts !== event.ts;
}

/**
 * Check if a message event is from a bot
 */
export function isBotMessage(event: Extract<SlackEvent, { type: "message" }>): boolean {
	return event.bot_id !== undefined;
}

/**
 * Filter out bot messages
 */
export function isUserMessage(event: Extract<SlackEvent, { type: "message" }>): boolean {
	return !isBotMessage(event);
}
