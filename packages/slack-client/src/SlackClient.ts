import { WebClient, ChatPostMessageResponse } from "@slack/web-api";
import {
	SlackEvent,
	SlackClientConfig,
	Message,
	Block,
	FileUploadOptions,
	ThreadHistoryOptions,
	PostMessageOptions,
	MessageSchema,
} from "./types.js";

export class SlackClient {
	private client: WebClient;
	private config: SlackClientConfig;

	constructor(config: SlackClientConfig) {
		this.config = config;
		this.client = new WebClient(config.token, {
			logLevel: config.logLevel,
		});
	}

	/**
	 * Handle incoming Slack events
	 */
	async handleEvent(event: SlackEvent): Promise<void> {
		switch (event.type) {
			case "app_mention":
				await this.handleAppMention(event);
				break;
			case "message":
				await this.handleMessage(event);
				break;
			case "reaction_added":
				await this.handleReactionAdded(event);
				break;
			default:
				console.warn(`Unhandled event type: ${(event as any).type}`);
		}
	}

	/**
	 * Handle app mention events
	 */
	private async handleAppMention(event: Extract<SlackEvent, { type: "app_mention" }>): Promise<void> {
		// Override this method in subclass or implement custom logic
		console.log("App mentioned:", event);
	}

	/**
	 * Handle message events
	 */
	private async handleMessage(event: Extract<SlackEvent, { type: "message" }>): Promise<void> {
		// Override this method in subclass or implement custom logic
		console.log("Message received:", event);
	}

	/**
	 * Handle reaction added events
	 */
	private async handleReactionAdded(event: Extract<SlackEvent, { type: "reaction_added" }>): Promise<void> {
		// Override this method in subclass or implement custom logic
		console.log("Reaction added:", event);
	}

	/**
	 * Post a message to a channel
	 */
	async postMessage(
		channel: string,
		text: string,
		options?: PostMessageOptions,
	): Promise<ChatPostMessageResponse> {
		const result = await this.client.chat.postMessage({
			channel,
			text,
			blocks: options?.blocks,
			thread_ts: options?.thread_ts,
			reply_broadcast: options?.reply_broadcast,
			unfurl_links: options?.unfurl_links,
			unfurl_media: options?.unfurl_media,
		});

		if (!result.ok) {
			throw new Error(`Failed to post message: ${result.error}`);
		}

		return result;
	}

	/**
	 * Post a reply to a thread
	 */
	async postThreadReply(
		channel: string,
		threadTs: string,
		text: string,
		blocks?: Block[],
	): Promise<ChatPostMessageResponse> {
		return this.postMessage(channel, text, {
			blocks,
			thread_ts: threadTs,
		});
	}

	/**
	 * Get the full history of a thread
	 */
	async getThreadHistory(
		channel: string,
		threadTs: string,
		options?: ThreadHistoryOptions,
	): Promise<Message[]> {
		const result = await this.client.conversations.replies({
			channel,
			ts: threadTs,
			limit: options?.limit,
			oldest: options?.oldest,
			latest: options?.latest,
			inclusive: options?.inclusive,
		});

		if (!result.ok) {
			throw new Error(`Failed to get thread history: ${result.error}`);
		}

		// Validate and parse messages
		const messages: Message[] = [];
		for (const msg of result.messages || []) {
			try {
				const parsed = MessageSchema.parse({
					...msg,
					channel,
				});
				messages.push(parsed);
			} catch (error) {
				console.warn("Failed to parse message:", error);
			}
		}

		return messages;
	}

	/**
	 * Upload a file to Slack
	 */
	async uploadFile(
		file: Buffer,
		filename: string,
		options?: FileUploadOptions,
	): Promise<void> {
		const result = await this.client.files.uploadV2({
			file,
			filename,
			channels: options?.channels,
			initial_comment: options?.initial_comment,
			thread_ts: options?.thread_ts,
			title: options?.title,
		});

		if (!result.ok) {
			throw new Error(`Failed to upload file: ${result.error}`);
		}
	}

	/**
	 * Get user information
	 */
	async getUserInfo(userId: string) {
		const result = await this.client.users.info({
			user: userId,
		});

		if (!result.ok) {
			throw new Error(`Failed to get user info: ${result.error}`);
		}

		return result.user;
	}

	/**
	 * Get channel information
	 */
	async getChannelInfo(channelId: string) {
		const result = await this.client.conversations.info({
			channel: channelId,
		});

		if (!result.ok) {
			throw new Error(`Failed to get channel info: ${result.error}`);
		}

		return result.channel;
	}

	/**
	 * Add a reaction to a message
	 */
	async addReaction(channel: string, timestamp: string, reaction: string): Promise<void> {
		const result = await this.client.reactions.add({
			channel,
			timestamp,
			name: reaction,
		});

		if (!result.ok) {
			throw new Error(`Failed to add reaction: ${result.error}`);
		}
	}

	/**
	 * Remove a reaction from a message
	 */
	async removeReaction(channel: string, timestamp: string, reaction: string): Promise<void> {
		const result = await this.client.reactions.remove({
			channel,
			timestamp,
			name: reaction,
		});

		if (!result.ok) {
			throw new Error(`Failed to remove reaction: ${result.error}`);
		}
	}

	/**
	 * Update an existing message
	 */
	async updateMessage(
		channel: string,
		timestamp: string,
		text: string,
		blocks?: Block[],
	): Promise<void> {
		const result = await this.client.chat.update({
			channel,
			ts: timestamp,
			text,
			blocks,
		});

		if (!result.ok) {
			throw new Error(`Failed to update message: ${result.error}`);
		}
	}

	/**
	 * Delete a message
	 */
	async deleteMessage(channel: string, timestamp: string): Promise<void> {
		const result = await this.client.chat.delete({
			channel,
			ts: timestamp,
		});

		if (!result.ok) {
			throw new Error(`Failed to delete message: ${result.error}`);
		}
	}

	/**
	 * Get the underlying WebClient for advanced usage
	 */
	getClient(): WebClient {
		return this.client;
	}
}
