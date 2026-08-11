import { z } from "zod";
import type { Client } from "@notionhq/client";

export const toolDefinition = {
  name: "notion_read_database",
  description:
    "Read the schema and metadata of a Notion database. " +
    "Returns the database title, description, property definitions (columns), and configuration. " +
    "Use this to understand a database's structure before querying it with notion_query_database. " +
    "Each property includes its name, type, and type-specific configuration (select options, " +
    "relation targets, formula expressions, etc.).",
  inputSchema: {
    type: "object" as const,
    properties: {
      database_id: {
        type: "string",
        description:
          "The ID of the Notion database to read. You can find this in the database URL " +
          "or by searching with notion_search_pages using filter_type: 'database'.",
      },
    },
    required: ["database_id"],
  },
};

const ArgsSchema = z.object({
  database_id: z.string().min(1, "Database ID is required"),
});

function formatPropertyConfig(
  prop: Record<string, unknown>,
): Record<string, unknown> {
  const propType = prop.type as string;
  const config: Record<string, unknown> = {
    name: prop.name,
    type: propType,
  };

  switch (propType) {
    case "select": {
      const selectConfig = prop.select as
        | { options: Array<{ name: string; color: string }> }
        | undefined;
      if (selectConfig?.options) {
        config.options = selectConfig.options.map((o) => ({
          name: o.name,
          color: o.color,
        }));
      }
      break;
    }
    case "multi_select": {
      const multiConfig = prop.multi_select as
        | { options: Array<{ name: string; color: string }> }
        | undefined;
      if (multiConfig?.options) {
        config.options = multiConfig.options.map((o) => ({
          name: o.name,
          color: o.color,
        }));
      }
      break;
    }
    case "relation": {
      const relationConfig = prop.relation as
        | { database_id: string; type: string }
        | undefined;
      if (relationConfig) {
        config.related_database_id = relationConfig.database_id;
        config.relation_type = relationConfig.type;
      }
      break;
    }
    case "rollup": {
      const rollupConfig = prop.rollup as
        | {
            relation_property_name: string;
            rollup_property_name: string;
            function: string;
          }
        | undefined;
      if (rollupConfig) {
        config.relation_property = rollupConfig.relation_property_name;
        config.rollup_property = rollupConfig.rollup_property_name;
        config.function = rollupConfig.function;
      }
      break;
    }
    case "formula": {
      const formulaConfig = prop.formula as
        | { expression: string }
        | undefined;
      if (formulaConfig) {
        config.expression = formulaConfig.expression;
      }
      break;
    }
    case "status": {
      const statusConfig = prop.status as
        | {
            options: Array<{ name: string; color: string }>;
            groups: Array<{
              name: string;
              option_ids: string[];
            }>;
          }
        | undefined;
      if (statusConfig?.options) {
        config.options = statusConfig.options.map((o) => ({
          name: o.name,
          color: o.color,
        }));
      }
      if (statusConfig?.groups) {
        config.groups = statusConfig.groups.map((g) => ({
          name: g.name,
          option_count: g.option_ids.length,
        }));
      }
      break;
    }
    // For simple types (title, rich_text, number, date, checkbox, url, email, phone_number,
    // created_time, last_edited_time, created_by, last_edited_by, files, people),
    // the type alone is sufficient.
  }

  return config;
}

export async function handler(
  notion: Client,
  args: Record<string, unknown>,
): Promise<{ content: [{ type: "text"; text: string }] }> {
  try {
    const parsed = ArgsSchema.parse(args);

    const database = await notion.databases.retrieve({
      database_id: parsed.database_id,
    });

    const db = database as Record<string, unknown>;

    // Extract title
    const titleArray = db.title as
      | Array<{ plain_text: string }>
      | undefined;
    const title = titleArray
      ? titleArray.map((t) => t.plain_text).join("")
      : "(untitled)";

    // Extract description
    const descArray = db.description as
      | Array<{ plain_text: string }>
      | undefined;
    const description = descArray
      ? descArray.map((d) => d.plain_text).join("")
      : "";

    // Format properties
    const properties = db.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    const formattedProperties = properties
      ? Object.entries(properties).map(([key, prop]) => ({
          key,
          ...formatPropertyConfig(prop),
        }))
      : [];

    const text =
      `**${title}**\n` +
      `ID: ${db.id}\n` +
      `URL: ${db.url}\n` +
      (description ? `Description: ${description}\n` : "") +
      `Created: ${db.created_time} | Last edited: ${db.last_edited_time}\n` +
      `\nProperties (${formattedProperties.length}):\n\n` +
      formattedProperties
        .map((p) => {
          let entry = `  **${p.key}** (${p.type})`;
          if (p.options) {
            const opts = p.options as Array<{ name: string }>;
            entry += `\n    Options: ${opts.map((o) => o.name).join(", ")}`;
          }
          if (p.expression) {
            entry += `\n    Formula: ${p.expression}`;
          }
          if (p.related_database_id) {
            entry += `\n    Related DB: ${p.related_database_id}`;
          }
          return entry;
        })
        .join("\n");

    return { content: [{ type: "text", text }] };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text",
          text: `Error reading database: ${message}`,
        },
      ],
    };
  }
}
