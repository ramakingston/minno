import { z } from "zod";

// Slack Block Kit types
export const BlockSchema = z.object({
	type: z.string(),
	block_id: z.string().optional(),
	elements: z.array(z.any()).optional(),
	text: z
		.object({
			type: z.string(),
			text: z.string(),
			emoji: z.boolean().optional(),
		})
		.optional(),
	accessory: z.any().optional(),
	fields: z.array(z.any()).optional(),
});

export type Block = z.infer<typeof BlockSchema>;

// Slack Message types
export const MessageSchema = z.object({
	type: z.literal("message"),
	subtype: z.string().optional(),
	text: z.string(),
	user: z.string().optional(),
	bot_id: z.string().optional(),
	ts: z.string(),
	thread_ts: z.string().optional(),
	channel: z.string(),
	blocks: z.array(BlockSchema).optional(),
	files: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				mimetype: z.string(),
				url_private: z.string(),
				url_private_download: z.string(),
			}),
		)
		.optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// Slack Event types
export const AppMentionEventSchema = z.object({
	type: z.literal("app_mention"),
	user: z.string(),
	text: z.string(),
	ts: z.string(),
	channel: z.string(),
	event_ts: z.string(),
	thread_ts: z.string().optional(),
});

export const MessageEventSchema = z.object({
	type: z.literal("message"),
	subtype: z.string().optional(),
	user: z.string().optional(),
	text: z.string(),
	ts: z.string(),
	channel: z.string(),
	event_ts: z.string(),
	thread_ts: z.string().optional(),
	bot_id: z.string().optional(),
});

export const ReactionAddedEventSchema = z.object({
	type: z.literal("reaction_added"),
	user: z.string(),
	reaction: z.string(),
	item: z.object({
		type: z.string(),
		channel: z.string(),
		ts: z.string(),
	}),
	event_ts: z.string(),
});

export const SlackEventSchema = z.union([
	AppMentionEventSchema,
	MessageEventSchema,
	ReactionAddedEventSchema,
]);

export type AppMentionEvent = z.infer<typeof AppMentionEventSchema>;
export type MessageEvent = z.infer<typeof MessageEventSchema>;
export type ReactionAddedEvent = z.infer<typeof ReactionAddedEventSchema>;
export type SlackEvent = z.infer<typeof SlackEventSchema>;

// Slack Event Wrapper (from Events API)
export const SlackEventWrapperSchema = z.object({
	token: z.string(),
	team_id: z.string(),
	api_app_id: z.string(),
	event: SlackEventSchema,
	type: z.literal("event_callback"),
	event_id: z.string(),
	event_time: z.number(),
	authorizations: z
		.array(
			z.object({
				enterprise_id: z.string().nullable().optional(),
				team_id: z.string(),
				user_id: z.string(),
				is_bot: z.boolean(),
				is_enterprise_install: z.boolean().optional(),
			}),
		)
		.optional(),
});

export type SlackEventWrapper = z.infer<typeof SlackEventWrapperSchema>;

// Slack Client Configuration
export interface SlackClientConfig {
	token: string;
	signingSecret?: string;
	appToken?: string;
	logLevel?: "debug" | "info" | "warn" | "error";
}

// File Upload Options
export interface FileUploadOptions {
	channels?: string;
	initial_comment?: string;
	thread_ts?: string;
	title?: string;
}

// Thread History Options
export interface ThreadHistoryOptions {
	limit?: number;
	oldest?: string;
	latest?: string;
	inclusive?: boolean;
}

// Post Message Options
export interface PostMessageOptions {
	blocks?: Block[];
	thread_ts?: string;
	reply_broadcast?: boolean;
	unfurl_links?: boolean;
	unfurl_media?: boolean;
}
