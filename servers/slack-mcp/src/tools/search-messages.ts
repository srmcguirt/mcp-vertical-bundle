/**
 * search_messages — Search Slack messages across channels.
 * Note: Requires a user token (xoxp-) with search:read scope.
 */

import { z } from 'zod';
import type { WebClient } from '@slack/web-api';

export const searchMessagesSchema = z.object({
  query: z.string().min(1).describe('Search query. Supports Slack search modifiers (from:, in:, has:, before:, after:)'),
  sort: z.enum(['score', 'timestamp']).default('score').describe('Sort by relevance or recency'),
  sort_dir: z.enum(['asc', 'desc']).default('desc').describe('Sort direction'),
  count: z.number().min(1).max(100).default(20).describe('Number of results to return'),
  page: z.number().min(1).default(1).describe('Page number'),
});

export type SearchMessagesInput = z.infer<typeof searchMessagesSchema>;

export async function searchMessages(client: WebClient, input: SearchMessagesInput): Promise<string> {
  const { query, sort, sort_dir, count, page } = input;

  const response = await client.search.messages({
    query,
    sort,
    sort_dir,
    count,
    page,
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.error}`);
  }

  const matches = response.messages?.matches ?? [];

  return JSON.stringify({
    query,
    total: response.messages?.total ?? 0,
    page,
    matches: matches.map(m => ({
      ts: m.ts,
      text: m.text,
      user: m.user,
      username: m.username,
      channel: m.channel ? { id: m.channel.id, name: m.channel.name } : null,
      permalink: m.permalink,
    })),
  });
}
