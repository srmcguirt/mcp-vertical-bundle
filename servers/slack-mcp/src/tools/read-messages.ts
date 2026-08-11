/**
 * read_messages — Read recent messages from a Slack channel.
 */

import { z } from 'zod';
import type { WebClient } from '@slack/web-api';

export const readMessagesSchema = z.object({
  channel: z.string().describe('Channel ID (e.g., C0123456789)'),
  limit: z.number().min(1).max(100).default(20).describe('Number of messages to return'),
  oldest: z.string().optional().describe('Unix timestamp — only messages after this time'),
  latest: z.string().optional().describe('Unix timestamp — only messages before this time'),
  include_replies: z.boolean().default(false).describe('Include thread replies for each message'),
});

export type ReadMessagesInput = z.infer<typeof readMessagesSchema>;

export async function readMessages(client: WebClient, input: ReadMessagesInput): Promise<string> {
  const { channel, limit, oldest, latest, include_replies } = input;

  const response = await client.conversations.history({
    channel,
    limit,
    oldest,
    latest,
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.error}`);
  }

  const messages = response.messages ?? [];

  // Optionally fetch thread replies
  const enrichedMessages = await Promise.all(
    messages.map(async (msg) => {
      const base = {
        ts: msg.ts,
        user: msg.user,
        text: msg.text,
        type: msg.type,
        thread_ts: msg.thread_ts,
        reply_count: msg.reply_count,
        reactions: msg.reactions?.map(r => ({
          name: r.name,
          count: r.count,
        })),
      };

      if (include_replies && msg.thread_ts && msg.reply_count && msg.reply_count > 0) {
        const threadResponse = await client.conversations.replies({
          channel,
          ts: msg.thread_ts,
          limit: 10,
        });

        return {
          ...base,
          replies: (threadResponse.messages ?? []).slice(1).map(reply => ({
            ts: reply.ts,
            user: reply.user,
            text: reply.text,
          })),
        };
      }

      return base;
    })
  );

  return JSON.stringify({
    channel,
    message_count: enrichedMessages.length,
    has_more: response.has_more,
    messages: enrichedMessages,
  });
}
