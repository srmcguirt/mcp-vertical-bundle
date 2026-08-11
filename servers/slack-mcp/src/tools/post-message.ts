/**
 * post_message — Post a message to a Slack channel.
 */

import { z } from 'zod';
import { WebClient } from '@slack/web-api';

export const toolDefinition = {
  name: "slack_post_message",
  description:
    "Post a message to a Slack channel. " +
    "Supports Slack mrkdwn formatting and threading via thread_ts.",
  inputSchema: {
    type: "object" as const,
    properties: {
      channel: {
        type: "string",
        description: "Channel ID to post to (e.g., C0123456789).",
      },
      text: {
        type: "string",
        description: "Message text (supports Slack mrkdwn formatting).",
      },
      thread_ts: {
        type: "string",
        description: "Reply to a thread (pass the parent message ts).",
      },
      unfurl_links: {
        type: "boolean",
        description: "Unfurl URL previews. Default: true.",
      },
      unfurl_media: {
        type: "boolean",
        description: "Unfurl media (images, etc.). Default: true.",
      },
    },
    required: ["channel", "text"],
  },
};

export async function handler(
  client: WebClient,
  args: Record<string, unknown>,
): Promise<{ content: [{ type: "text"; text: string }] }> {
  const parsed = postMessageSchema.parse(args);
  const result = await postMessage(client, parsed);
  return { content: [{ type: "text", text: result }] };
}

export const postMessageSchema = z.object({
  channel: z.string().describe('Channel ID to post to (e.g., C0123456789)'),
  text: z.string().min(1).describe('Message text (supports Slack mrkdwn formatting)'),
  thread_ts: z.string().optional().describe('Reply to a thread (pass the parent message ts)'),
  unfurl_links: z.boolean().default(true).describe('Unfurl URL previews'),
  unfurl_media: z.boolean().default(true).describe('Unfurl media (images, etc.)'),
});

export type PostMessageInput = z.infer<typeof postMessageSchema>;

export async function postMessage(client: WebClient, input: PostMessageInput): Promise<string> {
  const { channel, text, thread_ts, unfurl_links, unfurl_media } = input;

  const response = await client.chat.postMessage({
    channel,
    text,
    thread_ts,
    unfurl_links,
    unfurl_media,
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.error}`);
  }

  return JSON.stringify({
    ok: true,
    channel: response.channel,
    ts: response.ts,
    message: {
      text: response.message?.text,
      ts: response.message?.ts,
    },
  });
}
