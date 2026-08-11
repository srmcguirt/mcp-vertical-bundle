import { z } from "zod";
import type { Client } from "@notionhq/client";

export const toolDefinition = {
  name: "notion_read_database",
  description:
    "Retrieve the schema and metadata of a Notion database. Returns the database title, " +
    "description, all property definitions (columns) with their types and configuration, " +
    "and other metadata. Use this to understand a database's structure before querying it, " +
    "to discover available properties for filtering or sorting, or to inspect column types " +
    "(select options, relation targets, formula expressions, etc.).",
  inputSchema: {
    type: "object" as const,
    properties: {
      database_id: {
        type: "string",
        description:
          "The ID of the Notion database to retrieve. Can be a UUID with or without dashes.",
      },
    },
    required: ["database_id"],
  },
};

const ArgsSchema = z.object({
  database_id: z.string().min(1, "Database ID is required"),
});

function formatPropertySchema(
  name: string,
  prop: Record<string, unknown>,
): string {
  const type = prop.type as string;
  let details = `${name} (${type})`;

  switch (type) {
    case "select": {
      const selectConfig = prop.select as
        | { options: Array<{ name: string; color: string }> }
        | undefined;
      if (selectConfig?.options && selectConfig.options.length > 0) {
        const options = selectConfig.options
          .map((o) => o.name)
          .join(", ");
        details += ` — options: [${options}]`;
      }
      break;
    }
    case "multi_select": {
      const multiConfig = prop.multi_select as
        | { options: Array<{ name: string; color: string }> }
        | undefined;
      if (multiConfig?.options && multiConfig.options.length > 0) {
        const options = multiConfig.options
          .map((o) => o.name)
          .join(", ");
        details += ` — options: [${options}]`;
      }
      break;
    }
    case "status": {
      const statusConfig = prop.status as
        | { options: Array<{ name: string; color: string }> }
        | undefined;
      if (statusConfig?.options && statusConfig.options.length > 0) {
        const options = statusConfig.options
          .map((o) => o.name)
          .join(", ");
        details += ` — options: [${options}]`;
      }
      break;
    }
    case "relation": {
      const relationConfig = prop.relation as
        | { database_id: string; type: string }
        | undefined;
      if (relationConfig) {
        details += ` — linked to database: ${relationConfig.database_id} (${relationConfig.type})`;
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
        details += ` — ${rollupConfig.function} of "${rollupConfig.rollup_property_name}" via "${rollupConfig.relation_property_name}"`;
      }
      break;
    }
    case "formula": {
      const formulaConfig = prop.formula as
        | { expression: string }
        | undefined;
      if (formulaConfig?.expression) {
        details += ` — expression: ${formulaConfig.expression}`;
      }
      break;
    }
    case "number": {
      const numberConfig = prop.number as
        | { format: string }
        | undefined;
      if (numberConfig?.format) {
        details += ` — format: ${numberConfig.format}`;
      }
      break;
    }
    default:
      break;
  }

  return details;
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
    const title =
      titleArray && titleArray.length > 0
        ? titleArray.map((t) => t.plain_text).join("")
        : "(untitled)";

    // Extract description
    const descArray = db.description as
      | Array<{ plain_text: string }>
      | undefined;
    const description =
      descArray && descArray.length > 0
        ? descArray.map((d) => d.plain_text).join("")
        : "(no description)";

    // Format properties
    const properties = db.properties as Record<
      string,
      Record<string, unknown>
    >;
    const propertyLines = Object.entries(properties)
      .map(([name, prop]) => `  - ${formatPropertySchema(name, prop)}`)
      .join("\n");

    const text =
      `**${title}**\n` +
      `ID: ${db.id}\n` +
      `URL: ${db.url}\n` +
      `Description: ${description}\n` +
      `Inline: ${db.is_inline ?? false}\n` +
      `Created: ${db.created_time} | Last edited: ${db.last_edited_time}\n\n` +
      `Properties (${Object.keys(properties).length}):\n${propertyLines}`;

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
