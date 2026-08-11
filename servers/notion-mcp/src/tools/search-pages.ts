import { z } from "zod";
import type { Client } from "@notionhq/client";

export const toolDefinition = {
  name: "notion_search_pages",
  description:
    "Search across all pages and databases in the connected Notion workspace. " +
    "Returns matching pages and databases with their titles, URLs, and timestamps. " +
    "Use this to find specific pages by name, locate databases, or discover content " +
    "across the workspace. Supports filtering by object type (page or database), " +
    "sorting by last edited or creation time, and pagination for large result sets.",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "The search query string. Notion searches across page titles and content.",
      },
      filter_type: {
        type: "string",
        enum: ["page", "database"],
        description:
          "Filter results by object type. Omit to return both pages and databases.",
      },
      sort_direction: {
        type: "string",
        enum: ["ascending", "descending"],
        description:
          'Sort direction for results. Default: "descending" (most recent first).',
      },
      sort_timestamp: {
        type: "string",
        enum: ["last_edited_time", "created_time"],
        description:
          'Which timestamp to sort by. Default: "last_edited_time".',
      },
      page_size: {
        type: "number",
        description: "Number of results to return (1-100). Default: 10.",
        minimum: 1,
        maximum: 100,
      },
      start_cursor: {
        type: "string",
        description:
          "Cursor for pagination. Pass the next_cursor from a previous response to fetch the next page of results.",
      },
    },
    required: ["query"],
  },
};

const ArgsSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  filter_type: z.enum(["page", "database"]).optional(),
  sort_direction: z.enum(["ascending", "descending"]).default("descending"),
  sort_timestamp: z
    .enum(["last_edited_time", "created_time"])
    .default("last_edited_time"),
  page_size: z.number().min(1).max(100).default(10),
  start_cursor: z.string().optional(),
});

function extractTitle(page: Record<string, unknown>): string {
  const properties = page.properties as
    | Record<string, Record<string, unknown>>
    | undefined;

  if (!properties) {
    return "(untitled)";
  }

  for (const prop of Object.values(properties)) {
    if (prop.type === "title") {
      const titleArray = prop.title as Array<{ plain_text: string }> | undefined;
      if (titleArray && titleArray.length > 0) {
        return titleArray.map((t) => t.plain_text).join("");
      }
    }
  }

  // For database objects, title is a top-level array
  const titleField = page.title as Array<{ plain_text: string }> | undefined;
  if (titleField && titleField.length > 0) {
    return titleField.map((t) => t.plain_text).join("");
  }

  return "(untitled)";
}

export async function handler(
  notion: Client,
  args: Record<string, unknown>,
): Promise<{ content: [{ type: "text"; text: string }] }> {
  try {
    const parsed = ArgsSchema.parse(args);

    const searchParams: Parameters<typeof notion.search>[0] = {
      query: parsed.query,
      sort: {
        direction: parsed.sort_direction,
        timestamp: parsed.sort_timestamp,
      },
      page_size: parsed.page_size,
    };

    if (parsed.filter_type) {
      searchParams.filter = {
        property: "object",
        value: parsed.filter_type,
      };
    }

    if (parsed.start_cursor) {
      searchParams.start_cursor = parsed.start_cursor;
    }

    const response = await notion.search(searchParams);

    const results = response.results.map((item: Record<string, unknown>) => {
      const parent = item.parent as
        | Record<string, string>
        | undefined;

      let parentInfo = "workspace";
      if (parent) {
        if (parent.type === "database_id") {
          parentInfo = `database: ${parent.database_id}`;
        } else if (parent.type === "page_id") {
          parentInfo = `page: ${parent.page_id}`;
        } else if (parent.type === "workspace") {
          parentInfo = "workspace";
        }
      }

      return {
        id: item.id as string,
        title: extractTitle(item),
        object: item.object as string,
        url: item.url as string,
        created_time: item.created_time as string,
        last_edited_time: item.last_edited_time as string,
        parent: parentInfo,
      };
    });

    const paginationInfo = response.has_more
      ? `\n\nMore results available. Use start_cursor: "${response.next_cursor}" to fetch the next page.`
      : "";

    const text =
      results.length === 0
        ? `No results found for query: "${parsed.query}"`
        : `Found ${results.length} results for "${parsed.query}":\n\n${results
            .map(
              (r) =>
                `**${r.title}** (${r.object})\n` +
                `  ID: ${r.id}\n` +
                `  URL: ${r.url}\n` +
                `  Parent: ${r.parent}\n` +
                `  Created: ${r.created_time} | Last edited: ${r.last_edited_time}`,
            )
            .join("\n\n")}${paginationInfo}`;

    return { content: [{ type: "text", text }] };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text",
          text: `Error searching Notion: ${message}`,
        },
      ],
    };
  }
}
