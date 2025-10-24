import { WebClient } from '@slack/web-api';
import { config } from '../config.js';

export class SlackService {
  private client: WebClient;

  constructor(token?: string) {
    this.client = new WebClient(token);
  }

  /**
   * Send a message to a Slack channel
   */
  async sendMessage(channel: string, text: string, options?: Record<string, unknown>) {
    try {
      const result = await this.client.chat.postMessage({
        channel,
        text,
        ...options,
      });
      return result;
    } catch (error) {
      console.error('Error sending Slack message:', error);
      throw error;
    }
  }

  /**
   * Update an existing message
   */
  async updateMessage(channel: string, ts: string, text: string, options?: Record<string, unknown>) {
    try {
      const result = await this.client.chat.update({
        channel,
        ts,
        text,
        ...options,
      });
      return result;
    } catch (error) {
      console.error('Error updating Slack message:', error);
      throw error;
    }
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(channel: string, timestamp: string, emoji: string) {
    try {
      const result = await this.client.reactions.add({
        channel,
        timestamp,
        name: emoji,
      });
      return result;
    } catch (error) {
      console.error('Error adding Slack reaction:', error);
      throw error;
    }
  }

  /**
   * Get user information
   */
  async getUserInfo(userId: string) {
    try {
      const result = await this.client.users.info({
        user: userId,
      });
      return result.user;
    } catch (error) {
      console.error('Error getting Slack user info:', error);
      throw error;
    }
  }

  /**
   * Get channel information
   */
  async getChannelInfo(channelId: string) {
    try {
      const result = await this.client.conversations.info({
        channel: channelId,
      });
      return result.channel;
    } catch (error) {
      console.error('Error getting Slack channel info:', error);
      throw error;
    }
  }

  /**
   * Get thread messages
   */
  async getThreadMessages(channel: string, threadTs: string) {
    try {
      const result = await this.client.conversations.replies({
        channel,
        ts: threadTs,
      });
      return result.messages || [];
    } catch (error) {
      console.error('Error getting Slack thread messages:', error);
      throw error;
    }
  }
}
