import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { Client } from "@notionhq/client";

import {
  toolDefinition as searchPagesDefinition,
  handler as searchPagesHandler,
} from "./tools/search-pages.js";
import {
  toolDefinition as readDatabaseDefinition,
  handler as readDatabaseHandler,
} from "./tools/read-database.js";
import {
  toolDefinition as createPageDefinition,
  handler as createPageHandler,
} from "./tools/create-page.js";
import {
  toolDefinition as queryDatabaseDefinition,
  handler as queryDatabaseHandler,
} from "./tools/query-database.js";
import {
  listDatabasesSchema,
  listDatabases,
} from "./tools/list-databases.js";
import {
  readPageSchema,
  readPage,
} from "./tools/read-page.js";

// Load environment variables
dotenv.config();

// Validate token
const token = process.env.NOTION_API_KEY;
if (!token) {
  console.error(
    "NOTION_API_KEY environment variable is required. " +
      "Create an internal integration at https://www.notion.so/my-integrations",
  );
  process.exit(1);
}

// Initialize Notion client
const notion = new Client({
  auth: token,
});

// Additional tool definitions for tools that use Zod-schema exports
const listDatabasesDefinition = {
  name: "notion_list_databases",
  description:
    "List all Notion databases the integration has access to. " +
    "Returns database titles, IDs, URLs, timestamps, and a summary of each database's property schema. " +
    "Useful for discovering available databases before reading or querying them.",
  inputSchema: {
    type: "object" as const,
    properties: {
      page_size: {
        type: "number",
        description: "Number of databases to return (1-100). Default: 10.",
        minimum: 1,
        maximum: 100,
      },
      start_cursor: {
        type: "string",
        description: "Pagination cursor from a previous response.",
      },
    },
    required: [],
  },
};

const readPageDefinition = {
  name: "notion_read_page",
  description:
    "Read a Notion page's content (blocks) and convert to a readable text representation. " +
    "Returns the page title, metadata, and body content including headings, paragraphs, lists, " +
    "code blocks, quotes, and other block types rendered as markdown-like text.",
  inputSchema: {
    type: "object" as const,
    properties: {
      page_id: {
        type: "string",
        description: "Notion page ID (UUID format, with or without hyphens).",
      },
      max_blocks: {
        type: "number",
        description: "Maximum number of blocks to retrieve (1-200). Default: 100.",
        minimum: 1,
        maximum: 200,
      },
    },
    required: ["page_id"],
  },
};

// Tool registry
const tools = [
  searchPagesDefinition,
  readDatabaseDefinition,
  createPageDefinition,
  queryDatabaseDefinition,
  listDatabasesDefinition,
  readPageDefinition,
];

const handlers: Record<
  string,
  (
    client: Client,
    args: Record<string, unknown>,
  ) => Promise<{ content: [{ type: "text"; text: string }] }>
> = {
  [searchPagesDefinition.name]: searchPagesHandler,
  [readDatabaseDefinition.name]: readDatabaseHandler,
  [createPageDefinition.name]: createPageHandler,
  [queryDatabaseDefinition.name]: queryDatabaseHandler,
};

// Create MCP server
const server = new Server(
  {
    name: "wireforge-notion",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Check registry-based handlers first
    const registeredHandler = handlers[name];
    if (registeredHandler) {
      return await registeredHandler(notion, args ?? {});
    }

    // Handle Zod-schema-based tools
    switch (name) {
      case "notion_list_databases": {
        const validated = listDatabasesSchema.parse(args);
        const result = await listDatabases(notion, validated);
        return { content: [{ type: "text" as const, text: result }] };
      }

      case "notion_read_page": {
        const validated = readPageSchema.parse(args);
        const result = await readPage(notion, validated);
        return { content: [{ type: "text" as const, text: result }] };
      }

      default:
        return {
          content: [
            {
              type: "text" as const,
              text: `Unknown tool: "${name}". Available tools: ${tools.map((t) => t.name).join(", ")}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return {
      content: [
        {
          type: "text" as const,
          text: `Tool execution failed: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("WireForge Notion MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});
