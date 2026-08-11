/**
 * list_channels — List Slack channels the bot has access to.
 */

import { z } from 'zod';
import type { WebClient } from '@slack/web-api';

export const listChannelsSchema = z.object({
  types: z.string().default('public_channel').describe('Comma-separated channel types: public_channel, private_channel, mpim, im'),
  limit: z.number().min(1).max(200).default(50).describe('Max channels to return'),
  cursor: z.string().optional().describe('Pagination cursor from previous response'),
  exclude_archived: z.boolean().default(true).describe('Exclude archived channels'),
});

export type ListChannelsInput = z.infer<typeof listChannelsSchema>;

export async function listChannels(client: WebClient, input: ListChannelsInput): Promise<string> {
  const { types, limit, cursor, exclude_archived } = input;

  const response = await client.conversations.list({
    types,
    limit,
    cursor,
    exclude_archived,
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.error}`);
  }

  return JSON.stringify({
    channels: (response.channels ?? []).map(ch => ({
      id: ch.id,
      name: ch.name,
      is_private: ch.is_private,
      is_archived: ch.is_archived,
      topic: ch.topic?.value,
      purpose: ch.purpose?.value,
      num_members: ch.num_members,
      created: ch.created,
    })),
    next_cursor: response.response_metadata?.next_cursor || null,
  });
}
