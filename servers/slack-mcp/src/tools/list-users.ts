/**
 * list_users — List users in the Slack workspace.
 */

import { z } from 'zod';
import { WebClient } from '@slack/web-api';

export const toolDefinition = {
  name: "slack_list_users",
  description:
    "List users in the Slack workspace. " +
    "Returns user metadata including name, email, title, admin status, and timezone. " +
    "Filters out bots and deleted users. Supports pagination via cursor.",
  inputSchema: {
    type: "object" as const,
    properties: {
      limit: {
        type: "number",
        description: "Max users to return (1-200). Default: 50.",
        minimum: 1,
        maximum: 200,
      },
      cursor: {
        type: "string",
        description: "Pagination cursor from previous response.",
      },
      include_locale: {
        type: "boolean",
        description: "Include locale info. Default: false.",
      },
    },
    required: [],
  },
};

export async function handler(
  client: WebClient,
  args: Record<string, unknown>,
): Promise<{ content: [{ type: "text"; text: string }] }> {
  const parsed = listUsersSchema.parse(args);
  const result = await listUsers(client, parsed);
  return { content: [{ type: "text", text: result }] };
}

export const listUsersSchema = z.object({
  limit: z.number().min(1).max(200).default(50).describe('Max users to return'),
  cursor: z.string().optional().describe('Pagination cursor from previous response'),
  include_locale: z.boolean().default(false).describe('Include locale info'),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>;

export async function listUsers(client: WebClient, input: ListUsersInput): Promise<string> {
  const { limit, cursor, include_locale } = input;

  const response = await client.users.list({
    limit,
    cursor,
    include_locale,
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.error}`);
  }

  const members = (response.members ?? []).filter(m => !m.is_bot && !m.deleted);

  return JSON.stringify({
    users: members.map(u => ({
      id: u.id,
      name: u.name,
      real_name: u.real_name,
      display_name: u.profile?.display_name,
      email: u.profile?.email,
      title: u.profile?.title,
      is_admin: u.is_admin,
      is_owner: u.is_owner,
      timezone: u.tz,
      status_text: u.profile?.status_text,
      status_emoji: u.profile?.status_emoji,
    })),
    next_cursor: response.response_metadata?.next_cursor || null,
  });
}
