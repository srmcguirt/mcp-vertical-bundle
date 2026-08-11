import { z } from "zod";
import type { Client } from "@notionhq/client";

export const toolDefinition = {
  name: "notion_query_database",
  description:
    "Query a Notion database with filters and sorting. " +
    "Returns matching pages/entries with their property values. " +
    "Supports filtering by property values (equals, contains, greater_than, etc.) " +
    "and sorting by any property or timestamp. Use notion_read_database first to " +
    "understand the database schema and available properties before querying. " +
    "Results include page IDs, titles, URLs, and all property values.",
  inputSchema: {
    type: "object" as const,
    properties: {
      database_id: {
        type: "string",
        description: "The ID of the Notion database to query.",
      },
      filter: {
        type: "object",
        description:
          "A Notion filter object. Simple example: " +
          '{"property": "Status", "select": {"equals": "Done"}}. ' +
          "Compound example: " +
          '{"and": [{"property": "Status", "select": {"equals": "In Progress"}}, ' +
          '{"property": "Priority", "number": {"greater_than": 2}}]}. ' +
          "Supported filter types per property: select (equals/does_not_equal), " +
          "multi_select (contains/does_not_contain), rich_text/title (equals/contains/starts_with/is_empty), " +
          "number (equals/greater_than/less_than/greater_than_or_equal_to/less_than_or_equal_to), " +
          "checkbox (equals), date (equals/before/after/on_or_before/on_or_after), " +
          "status (equals/does_not_equal).",
        additionalProperties: true,
      },
      sorts: {
        type: "array",
        description:
          "Array of sort objects. Each sort: " +
          '{"property": "Name", "direction": "ascending"} or ' +
          '{"timestamp": "created_time", "direction": "descending"}.',
        items: {
          type: "object",
          properties: {
            property: { type: "string" },
            timestamp: {
              type: "string",
              enum: ["created_time", "last_edited_time"],
            },
            direction: {
              type: "string",
              enum: ["ascending", "descending"],
            },
          },
          required: ["direction"],
        },
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
          "Cursor for pagination. Pass the next_cursor from a previous response to fetch the next page.",
      },
    },
    required: ["database_id"],
  },
};

const SortSchema = z.object({
  property: z.string().optional(),
  timestamp: z.enum(["created_time", "last_edited_time"]).optional(),
  direction: z.enum(["ascending", "descending"]),
});

const ArgsSchema = z.object({
  database_id: z.string().min(1, "Database ID is required"),
  filter: z.record(z.unknown()).optional(),
  sorts: z.array(SortSchema).optional(),
  page_size: z.number().min(1).max(100).default(10),
  start_cursor: z.string().optional(),
});

function extractTitle(properties: Record<string, unknown>): string {
  for (const prop of Object.values(properties)) {
    const p = prop as Record<string, unknown>;
    if (p.type === "title") {
      const titleArray = p.title as
        | Array<{ plain_text: string }>
        | undefined;
      if (titleArray && titleArray.length > 0) {
        return titleArray.map((t) => t.plain_text).join("");
      }
    }
  }
  return "(untitled)";
}

function formatPropertyValue(prop: Record<string, unknown>): string {
  const propType = prop.type as string;

  switch (propType) {
    case "title": {
      const arr = prop.title as Array<{ plain_text: string }> | undefined;
      return arr ? arr.map((t) => t.plain_text).join("") : "";
    }
    case "rich_text": {
      const arr = prop.rich_text as
        | Array<{ plain_text: string }>
        | undefined;
      return arr ? arr.map((t) => t.plain_text).join("") : "";
    }
    case "number":
      return prop.number != null ? String(prop.number) : "";
    case "select": {
      const sel = prop.select as { name: string } | null;
      return sel ? sel.name : "";
    }
    case "multi_select": {
      const items = prop.multi_select as Array<{ name: string }> | undefined;
      return items ? items.map((i) => i.name).join(", ") : "";
    }
    case "status": {
      const status = prop.status as { name: string } | null;
      return status ? status.name : "";
    }
    case "date": {
      const date = prop.date as
        | { start: string; end?: string }
        | null;
      if (!date) return "";
      return date.end ? `${date.start} -> ${date.end}` : date.start;
    }
    case "checkbox":
      return prop.checkbox ? "true" : "false";
    case "url":
      return (prop.url as string) ?? "";
    case "email":
      return (prop.email as string) ?? "";
    case "phone_number":
      return (prop.phone_number as string) ?? "";
    case "people": {
      const people = prop.people as
        | Array<{ name?: string; id: string }>
        | undefined;
      return people ? people.map((p) => p.name ?? p.id).join(", ") : "";
    }
    case "relation": {
      const relations = prop.relation as Array<{ id: string }> | undefined;
      return relations ? relations.map((r) => r.id).join(", ") : "";
    }
    case "formula": {
      const formula = prop.formula as Record<string, unknown> | undefined;
      if (!formula) return "";
      const fType = formula.type as string;
      return String(formula[fType] ?? "");
    }
    case "rollup": {
      const rollup = prop.rollup as Record<string, unknown> | undefined;
      if (!rollup) return "";
      const rType = rollup.type as string;
      if (rType === "array") {
        const arr = rollup.array as Array<Record<string, unknown>> | undefined;
        return arr
          ? arr.map((item) => formatPropertyValue(item)).join(", ")
          : "";
      }
      return String(rollup[rType] ?? "");
    }
    case "created_time":
      return (prop.created_time as string) ?? "";
    case "last_edited_time":
      return (prop.last_edited_time as string) ?? "";
    case "created_by":
    case "last_edited_by": {
      const user = prop[propType] as
        | { name?: string; id: string }
        | undefined;
      return user ? user.name ?? user.id : "";
    }
    case "files": {
      const files = prop.files as
        | Array<{ name: string; type: string }>
        | undefined;
      return files ? files.map((f) => f.name).join(", ") : "";
    }
    default:
      return `[${propType}]`;
  }
}

export async function handler(
  notion: Client,
  args: Record<string, unknown>,
): Promise<{ content: [{ type: "text"; text: string }] }> {
  try {
    const parsed = ArgsSchema.parse(args);

    const queryParams: Record<string, unknown> = {
      database_id: parsed.database_id,
      page_size: parsed.page_size,
    };

    if (parsed.filter) {
      queryParams.filter = parsed.filter;
    }

    if (parsed.sorts) {
      queryParams.sorts = parsed.sorts;
    }

    if (parsed.start_cursor) {
      queryParams.start_cursor = parsed.start_cursor;
    }

    const response = await notion.databases.query(
      queryParams as Parameters<typeof notion.databases.query>[0],
    );

    const results = response.results.map((page: Record<string, unknown>) => {
      const properties = page.properties as Record<
        string,
        Record<string, unknown>
      >;

      const title = extractTitle(properties);

      const formattedProps: Record<string, string> = {};
      for (const [key, prop] of Object.entries(properties)) {
        formattedProps[key] = formatPropertyValue(prop);
      }

      return {
        id: page.id as string,
        title,
        url: page.url as string,
        created_time: page.created_time as string,
        last_edited_time: page.last_edited_time as string,
        properties: formattedProps,
      };
    });

    const paginationInfo = response.has_more
      ? `\n\nMore results available. Use start_cursor: "${response.next_cursor}" to fetch the next page.`
      : "";

    const text =
      results.length === 0
        ? "No results found matching the query."
        : `Found ${results.length} result(s):\n\n${results
            .map((r) => {
              const propLines = Object.entries(r.properties)
                .filter(([, v]) => v !== "")
                .map(([k, v]) => `  ${k}: ${v}`)
                .join("\n");
              return (
                `**${r.title}**\n` +
                `  ID: ${r.id}\n` +
                `  URL: ${r.url}\n` +
                `  Created: ${r.created_time} | Last edited: ${r.last_edited_time}\n` +
                propLines
              );
            })
            .join("\n\n")}${paginationInfo}`;

    return { content: [{ type: "text", text }] };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text",
          text: `Error querying database: ${message}`,
        },
      ],
    };
  }
}
