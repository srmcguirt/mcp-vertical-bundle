import { z } from "zod";
import type { Client } from "@notionhq/client";

export const toolDefinition = {
  name: "notion_create_page",
  description:
    "Create a new page in Notion. The page can be created as a child of an existing page " +
    "or as an entry in a database. When creating a database entry, provide properties matching " +
    "the database schema. The content parameter accepts an array of block objects for the page body. " +
    "Supports title, rich text, number, select, multi-select, date, checkbox, url, email, and " +
    "phone number property types.",
  inputSchema: {
    type: "object" as const,
    properties: {
      parent_type: {
        type: "string",
        enum: ["page_id", "database_id"],
        description:
          'Whether the parent is a page or a database. Default: "page_id".',
      },
      parent_id: {
        type: "string",
        description:
          "The ID of the parent page or database where this page will be created.",
      },
      title: {
        type: "string",
        description:
          "The page title. For database entries, this sets the title property.",
      },
      properties: {
        type: "object",
        description:
          "Properties to set on the page. For database entries, keys must match database property names. " +
          "Values are objects with a type field and corresponding value. " +
          'Examples: {"Status": {"select": "Done"}, "Priority": {"number": 1}, "Tags": {"multi_select": ["bug", "urgent"]}}',
        additionalProperties: true,
      },
      content: {
        type: "array",
        description:
          "Page body content as an array of simplified block objects. " +
          'Each block: {"type": "paragraph"|"heading_1"|"heading_2"|"heading_3"|"bulleted_list_item"|"numbered_list_item"|"to_do"|"code"|"quote"|"divider", "text": "content"}. ' +
          'For to_do blocks, add "checked": true/false. For code blocks, add "language": "python" etc.',
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            text: { type: "string" },
            checked: { type: "boolean" },
            language: { type: "string" },
          },
          required: ["type"],
        },
      },
      icon_emoji: {
        type: "string",
        description:
          'An emoji character to use as the page icon. Example: "🚀".',
      },
    },
    required: ["parent_id", "title"],
  },
};

const BlockSchema = z.object({
  type: z.enum([
    "paragraph",
    "heading_1",
    "heading_2",
    "heading_3",
    "bulleted_list_item",
    "numbered_list_item",
    "to_do",
    "code",
    "quote",
    "divider",
  ]),
  text: z.string().optional(),
  checked: z.boolean().optional(),
  language: z.string().optional(),
});

const ArgsSchema = z.object({
  parent_type: z.enum(["page_id", "database_id"]).default("page_id"),
  parent_id: z.string().min(1, "Parent ID is required"),
  title: z.string().min(1, "Title is required"),
  properties: z.record(z.unknown()).optional(),
  content: z.array(BlockSchema).optional(),
  icon_emoji: z.string().optional(),
});

function makeRichText(text: string): Array<{
  type: "text";
  text: { content: string };
}> {
  return [{ type: "text", text: { content: text } }];
}

function buildBlocks(
  blocks: Array<z.infer<typeof BlockSchema>>,
): Array<Record<string, unknown>> {
  return blocks.map((block) => {
    if (block.type === "divider") {
      return { object: "block", type: "divider", divider: {} };
    }

    const richText = makeRichText(block.text ?? "");

    switch (block.type) {
      case "paragraph":
        return {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: richText },
        };
      case "heading_1":
        return {
          object: "block",
          type: "heading_1",
          heading_1: { rich_text: richText },
        };
      case "heading_2":
        return {
          object: "block",
          type: "heading_2",
          heading_2: { rich_text: richText },
        };
      case "heading_3":
        return {
          object: "block",
          type: "heading_3",
          heading_3: { rich_text: richText },
        };
      case "bulleted_list_item":
        return {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: { rich_text: richText },
        };
      case "numbered_list_item":
        return {
          object: "block",
          type: "numbered_list_item",
          numbered_list_item: { rich_text: richText },
        };
      case "to_do":
        return {
          object: "block",
          type: "to_do",
          to_do: {
            rich_text: richText,
            checked: block.checked ?? false,
          },
        };
      case "code":
        return {
          object: "block",
          type: "code",
          code: {
            rich_text: richText,
            language: block.language ?? "plain text",
          },
        };
      case "quote":
        return {
          object: "block",
          type: "quote",
          quote: { rich_text: richText },
        };
      default:
        return {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: richText },
        };
    }
  });
}

function buildProperties(
  title: string,
  parentType: string,
  userProps?: Record<string, unknown>,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  if (parentType === "database_id") {
    // Database entries use the title property
    properties["Name"] = {
      title: makeRichText(title),
    };
  } else {
    // Standalone pages use the title property
    properties["title"] = {
      title: makeRichText(title),
    };
  }

  if (userProps) {
    for (const [key, value] of Object.entries(userProps)) {
      if (key === "Name" || key === "title") continue; // Already set

      const val = value as Record<string, unknown>;

      if (val.select !== undefined) {
        properties[key] = {
          select: { name: String(val.select) },
        };
      } else if (val.multi_select !== undefined) {
        const items = val.multi_select as string[];
        properties[key] = {
          multi_select: items.map((name) => ({ name })),
        };
      } else if (val.number !== undefined) {
        properties[key] = { number: Number(val.number) };
      } else if (val.checkbox !== undefined) {
        properties[key] = { checkbox: Boolean(val.checkbox) };
      } else if (val.url !== undefined) {
        properties[key] = { url: String(val.url) };
      } else if (val.email !== undefined) {
        properties[key] = { email: String(val.email) };
      } else if (val.phone_number !== undefined) {
        properties[key] = {
          phone_number: String(val.phone_number),
        };
      } else if (val.date !== undefined) {
        const dateVal = val.date as
          | string
          | { start: string; end?: string };
        if (typeof dateVal === "string") {
          properties[key] = { date: { start: dateVal } };
        } else {
          properties[key] = { date: dateVal };
        }
      } else if (val.rich_text !== undefined) {
        properties[key] = {
          rich_text: makeRichText(String(val.rich_text)),
        };
      } else {
        // Pass through as-is for advanced property types
        properties[key] = val;
      }
    }
  }

  return properties;
}

export async function handler(
  notion: Client,
  args: Record<string, unknown>,
): Promise<{ content: [{ type: "text"; text: string }] }> {
  try {
    const parsed = ArgsSchema.parse(args);

    const parent =
      parsed.parent_type === "database_id"
        ? { database_id: parsed.parent_id }
        : { page_id: parsed.parent_id };

    const properties = buildProperties(
      parsed.title,
      parsed.parent_type,
      parsed.properties,
    );

    const createParams: Record<string, unknown> = {
      parent,
      properties,
    };

    if (parsed.icon_emoji) {
      createParams.icon = {
        type: "emoji",
        emoji: parsed.icon_emoji,
      };
    }

    if (parsed.content && parsed.content.length > 0) {
      createParams.children = buildBlocks(parsed.content);
    }

    const page = (await notion.pages.create(
      createParams as Parameters<typeof notion.pages.create>[0],
    )) as Record<string, unknown>;

    const text =
      `Page created successfully.\n\n` +
      `Title: ${parsed.title}\n` +
      `ID: ${page.id}\n` +
      `URL: ${page.url}\n` +
      `Created: ${page.created_time}\n` +
      `Parent: ${parsed.parent_type} (${parsed.parent_id})`;

    return { content: [{ type: "text", text }] };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text",
          text: `Error creating page: ${message}`,
        },
      ],
    };
  }
}
