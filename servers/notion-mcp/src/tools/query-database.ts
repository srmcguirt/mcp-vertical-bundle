import { z } from "zod";
import type { Client } from "@notionhq/client";

export const toolDefinition = {
  name: "notion_query_database",
  description:
    "Query a Notion database with optional filters and sorts. Returns pages (rows) " +
    "from the database with their property values extracted into a readable format. " +
    "Supports the full Notion filter syntax for complex queries (compound filters with " +
    "and/or, property-specific filters for text, number, date, select, etc.). " +
    "Also supports multi-column sorting and pagination. Use notion_read_database first " +
    "to discover the available properties and their types before building filters.",
  inputSchema: {
    type: "object" as const,
    properties: {
      database_id: {
        type: "string",
        description:
          "The ID of the Notion database to query. Can be a UUID with or without dashes.",
      },
      filter: {
        type: "object",
        description:
          "A Notion filter object. Supports compound filters (and/or) and property filters. " +
          'Example: {"property": "Status", "select": {"equals": "Done"}}. ' +
          "See Notion API docs for the full filter syntax. Optional.",
        additionalProperties: true,
      },
      sorts: {
        type: "array",
        description:
          "Array of sort objects. Each sort specifies a property name and direction. " +
          'Example: [{"property": "Created", "direction": "descending"}]. ' +
          'You can also sort by timestamp: [{"timestamp": "last_edited_time", "direction": "ascending"}]. Optional.',
        items: {
          type: "object",
          additionalProperties: true,
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

const ArgsSchema = z.object({
  database_id: z.string().min(1, "Database ID is required"),
  filter: z.record(z.string(), z.unknown()).optional(),
  sorts: z.array(z.record(z.string(), z.unknown())).optional(),
  page_size: z.number().min(1).max(100).default(10),
  start_cursor: z.string().optional(),
});

function extractPropertyValue(
  name: string,
  prop: Record<string, unknown>,
): string {
  const type = prop.type as string;

  switch (type) {
    case "title": {
      const titleArray = prop.title as
        | Array<{ plain_text: string }>
        | undefined;
      if (titleArray && titleArray.length > 0) {
        return titleArray.map((t) => t.plain_text).join("");
      }
      return "";
    }
    case "rich_text": {
      const textArray = prop.rich_text as
        | Array<{ plain_text: string }>
        | undefined;
      if (textArray && textArray.length > 0) {
        return textArray.map((t) => t.plain_text).join("");
      }
      return "";
    }
    case "number": {
      const num = prop.number;
      return num !== null && num !== undefined ? String(num) : "";
    }
    case "select": {
      const select = prop.select as { name: string } | null;
      return select?.name ?? "";
    }
    case "multi_select": {
      const multiSelect = prop.multi_select as
        | Array<{ name: string }>
        | undefined;
      if (multiSelect && multiSelect.length > 0) {
        return multiSelect.map((s) => s.name).join(", ");
      }
      return "";
    }
    case "date": {
      const date = prop.date as
        | { start: string; end?: string | null }
        | null;
      if (!date) return "";
      return date.end ? `${date.start} to ${date.end}` : date.start;
    }
    case "checkbox": {
      return prop.checkbox ? "true" : "false";
    }
    case "url": {
      return (prop.url as string) ?? "";
    }
    case "email": {
      return (prop.email as string) ?? "";
    }
    case "phone_number": {
      return (prop.phone_number as string) ?? "";
    }
    case "status": {
      const status = prop.status as { name: string } | null;
      return status?.name ?? "";
    }
    case "people": {
      const people = prop.people as
        | Array<{ name?: string; id: string }>
        | undefined;
      if (people && people.length > 0) {
        return people.map((p) => p.name ?? p.id).join(", ");
      }
      return "";
    }
    case "relation": {
      const relations = prop.relation as
        | Array<{ id: string }>
        | undefined;
      if (relations && relations.length > 0) {
        return relations.map((r) => r.id).join(", ");
      }
      return "";
    }
    case "formula": {
      const formula = prop.formula as Record<string, unknown> | undefined;
      if (!formula) return "";
      const formulaType = formula.type as string;
      if (formulaType === "string") return (formula.string as string) ?? "";
      if (formulaType === "number")
        return formula.number !== null ? String(formula.number) : "";
      if (formulaType === "boolean") return String(formula.boolean ?? "");
      if (formulaType === "date") {
        const fDate = formula.date as
          | { start: string; end?: string | null }
          | null;
        if (!fDate) return "";
        return fDate.end ? `${fDate.start} to ${fDate.end}` : fDate.start;
      }
      return JSON.stringify(formula);
    }
    case "rollup": {
      const rollup = prop.rollup as Record<string, unknown> | undefined;
      if (!rollup) return "";
      const rollupType = rollup.type as string;
      if (rollupType === "number")
        return rollup.number !== null ? String(rollup.number) : "";
      if (rollupType === "date") {
        const rDate = rollup.date as
          | { start: string; end?: string | null }
          | null;
        if (!rDate) return "";
        return rDate.end ? `${rDate.start} to ${rDate.end}` : rDate.start;
      }
      if (rollupType === "array") {
        const arr = rollup.array as Array<Record<string, unknown>> | undefined;
        if (arr && arr.length > 0) {
          return arr
            .map((item) => extractPropertyValue("", item))
            .filter(Boolean)
            .join(", ");
        }
        return "";
      }
      return JSON.stringify(rollup);
    }
    case "created_time": {
      return (prop.created_time as string) ?? "";
    }
    case "created_by": {
      const createdBy = prop.created_by as
        | { name?: string; id: string }
        | undefined;
      return createdBy?.name ?? createdBy?.id ?? "";
    }
    case "last_edited_time": {
      return (prop.last_edited_time as string) ?? "";
    }
    case "last_edited_by": {
      const editedBy = prop.last_edited_by as
        | { name?: string; id: string }
        | undefined;
      return editedBy?.name ?? editedBy?.id ?? "";
    }
    case "files": {
      const files = prop.files as
        | Array<{ name: string; type: string }>
        | undefined;
      if (files && files.length > 0) {
        return files.map((f) => f.name).join(", ");
      }
      return "";
    }
    case "unique_id": {
      const uid = prop.unique_id as
        | { prefix?: string | null; number: number }
        | undefined;
      if (!uid) return "";
      return uid.prefix ? `${uid.prefix}-${uid.number}` : String(uid.number);
    }
    default:
      return `(${type})`;
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

      const readableProps: Record<string, string> = {};
      for (const [propName, propValue] of Object.entries(properties)) {
        const extracted = extractPropertyValue(propName, propValue);
        if (extracted !== "") {
          readableProps[propName] = extracted;
        }
      }

      return {
        id: page.id as string,
        url: page.url as string,
        created_time: page.created_time as string,
        last_edited_time: page.last_edited_time as string,
        properties: readableProps,
      };
    });

    const paginationInfo = response.has_more
      ? `\n\nMore results available. Use start_cursor: "${response.next_cursor}" to fetch the next page.`
      : "";

    const text =
      results.length === 0
        ? "No results found matching the query."
        : `Found ${results.length} results:\n\n${results
            .map((r) => {
              const propLines = Object.entries(r.properties)
                .map(([key, val]) => `    ${key}: ${val}`)
                .join("\n");
              return (
                `  ID: ${r.id}\n` +
                `  URL: ${r.url}\n` +
                `  Created: ${r.created_time} | Last edited: ${r.last_edited_time}\n` +
                `  Properties:\n${propLines}`
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
