import { z } from "zod";
import type { WebClient } from "@slack/web-api";

export const toolDefinition = {
  name: "slack_search_channels",
  description:
    "Search and list Slack channels in the workspace. " +
    "Returns channel metadata including name, topic, purpose, member count, and archive/privacy status. " +
    "Use the optional query parameter to filter channels by name, topic, or purpose. " +
    "Supports pagination via cursor for large workspaces. " +
    "Includes both public and private channels the bot has access to.",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "Optional search term to filter channels by name, topic, or purpose (case-insensitive).",
      },
      exclude_archived: {
        type: "boolean",
        description: "Whether to exclude archived channels from results. Default: true.",
      },
      limit: {
        type: "number",
        description:
          "Maximum number of channels to return (1-1000). Default: 100.",
        minimum: 1,
        maximum: 1000,
      },
      cursor: {
        type: "string",
        description:
          "Pagination cursor returned from a previous request. Use to fetch the next page of results.",
      },
    },
    required: [],
  },
};

const ArgsSchema = z.object({
  query: z.string().optional(),
  exclude_archived: z.boolean().default(true),
  limit: z.number().min(1).max(1000).default(100),
  cursor: z.string().optional(),
});

export async function handler(
  client: WebClient,
  args: Record<string, unknown>,
): Promise<{ content: [{ type: "text"; text: string }] }> {
  try {
    const parsed = ArgsSchema.parse(args);

    const response = await client.conversations.list({
      types: "public_channel,private_channel",
      exclude_archived: parsed.exclude_archived,
      limit: parsed.limit,
      cursor: parsed.cursor,
    });

    if (!response.ok || !response.channels) {
      return {
        content: [
          {
            type: "text",
            text: `Error from Slack API: ${response.error ?? "No channels returned"}`,
          },
        ],
      };
    }

    let channels = response.channels;

    // Filter by query if provided
    if (parsed.query) {
      const q = parsed.query.toLowerCase();
      channels = channels.filter((ch) => {
        const name = (ch.name ?? "").toLowerCase();
        const topic = (ch.topic?.value ?? "").toLowerCase();
        const purpose = (ch.purpose?.value ?? "").toLowerCase();
        return name.includes(q) || topic.includes(q) || purpose.includes(q);
      });
    }

    const formatted = channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      topic: ch.topic?.value || "",
      purpose: ch.purpose?.value || "",
      num_members: ch.num_members ?? 0,
      is_archived: ch.is_archived ?? false,
      is_private: ch.is_private ?? false,
    }));

    const nextCursor = response.response_metadata?.next_cursor;
    const paginationNote = nextCursor
      ? `\n\nMore results available. Use cursor: "${nextCursor}" to fetch the next page.`
      : "";

    const text =
      formatted.length === 0
        ? "No channels found matching the specified criteria."
        : `Found ${formatted.length} channel(s):\n\n${formatted
            .map(
              (ch) =>
                `**#${ch.name}** (${ch.id})\n` +
                `  Topic: ${ch.topic || "(none)"}\n` +
                `  Purpose: ${ch.purpose || "(none)"}\n` +
                `  Members: ${ch.num_members} | Private: ${ch.is_private} | Archived: ${ch.is_archived}`,
            )
            .join("\n\n")}${paginationNote}`;

    return { content: [{ type: "text", text }] };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text",
          text: `Error searching channels: ${message}`,
        },
      ],
    };
  }
}
