import { z } from "zod";
import type { Client } from "@notionhq/client";

export const toolDefinition = {
  name: "notion_create_page",
  description:
    "Create a new page in Notion, either as a child of a database or another page. " +
    "When creating a page in a database, you can set property values that match the " +
    "database schema. Optionally include text content as paragraph blocks and set an " +
    "emoji icon. Use this to add new entries to databases, create sub-pages, or " +
    "build out a page hierarchy in a workspace.",
  inputSchema: {
    type: "object" as const,
    properties: {
      parent_type: {
        type: "string",
        enum: ["database_id", "page_id"],
        description:
          'The type of parent. Use "database_id" to add a row to a database, ' +
          'or "page_id" to create a child page under an existing page.',
      },
      parent_id: {
        type: "string",
        description:
          "The ID of the parent database or page. Can be a UUID with or without dashes.",
      },
      title: {
        type: "string",
        description:
          "The title of the new page. For database pages this sets the title property.",
      },
      properties: {
        type: "object",
        description:
          "Additional properties to set on the page (for database pages). " +
          "Keys should match the database property names. Values should be " +
          "formatted according to the property type. For example: " +
          '{"Status": {"select": {"name": "In Progress"}}, "Priority": {"number": 1}}. ' +
          "Omit if creating a simple page under another page.",
        additionalProperties: true,
      },
      content: {
        type: "string",
        description:
          "Plain text content to add to the page body as paragraph blocks. " +
          "Each line becomes a separate paragraph. Optional.",
      },
      icon_emoji: {
        type: "string",
        description:
          'An emoji character to use as the page icon. For example: "📝". Optional.',
      },
    },
    required: ["parent_type", "parent_id", "title"],
  },
};

const ArgsSchema = z.object({
  parent_type: z.enum(["database_id", "page_id"]),
  parent_id: z.string().min(1, "Parent ID is required"),
  title: z.string().min(1, "Title is required"),
  properties: z.record(z.string(), z.unknown()).optional(),
  content: z.string().optional(),
  icon_emoji: z.string().optional(),
});

export async function handler(
  notion: Client,
  args: Record<string, unknown>,
): Promise<{ content: [{ type: "text"; text: string }] }> {
  try {
    const parsed = ArgsSchema.parse(args);

    // Build parent
    const parent =
      parsed.parent_type === "database_id"
        ? { database_id: parsed.parent_id }
        : { page_id: parsed.parent_id };

    // Build properties
    // For database pages, we need to figure out the title property name.
    // The Notion API expects the title property to use the correct name from the schema.
    // We use "Name" as the default (most common), but if additional properties include
    // a title-type property, the API will resolve it.
    const titleProperty: Record<string, unknown> = {
      title: [
        {
          text: {
            content: parsed.title,
          },
        },
      ],
    };

    let properties: Record<string, unknown>;

    if (parsed.parent_type === "database_id") {
      // For database pages, try to detect the title property name.
      // Default to "Name" which is the most common title property name in Notion.
      // If the user provides a title property in their properties object, it will override this.
      properties = {
        Name: titleProperty,
        ...(parsed.properties ?? {}),
      };

      // If user explicitly provided a "title" key (lowercase), handle it
      if (
        parsed.properties &&
        "title" in parsed.properties &&
        !("Name" in parsed.properties)
      ) {
        // The user may have a database with a differently-named title property.
        // The Notion API will use whichever property is of type "title" in the schema.
        properties = {
          ...parsed.properties,
          // Keep the user's title property as-is if they formatted it as a Notion property
          // Otherwise wrap it
          title:
            typeof parsed.properties.title === "object"
              ? parsed.properties.title
              : titleProperty,
        };
      }
    } else {
      // For child pages of a page, use the standard "title" property
      properties = {
        title: titleProperty,
      };
    }

    // Build children (content blocks)
    const children: Array<Record<string, unknown>> = [];

    if (parsed.content) {
      const lines = parsed.content.split("\n");
      for (const line of lines) {
        children.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: line,
                },
              },
            ],
          },
        });
      }
    }

    // Build the create request
    const createParams: Record<string, unknown> = {
      parent,
      properties,
    };

    if (children.length > 0) {
      createParams.children = children;
    }

    if (parsed.icon_emoji) {
      createParams.icon = {
        type: "emoji",
        emoji: parsed.icon_emoji,
      };
    }

    const page = await notion.pages.create(
      createParams as Parameters<typeof notion.pages.create>[0],
    );

    const result = page as Record<string, unknown>;

    const text =
      `Page created successfully.\n` +
      `  ID: ${result.id}\n` +
      `  URL: ${result.url}\n` +
      `  Created: ${result.created_time}`;

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
