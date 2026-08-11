import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@notionhq/client";
import dotenv from "dotenv";

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

dotenv.config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;

if (!NOTION_API_KEY) {
  console.error(
    "NOTION_API_KEY environment variable is required. " +
      "Create a Notion integration at https://www.notion.so/my-integrations " +
      "and set the API key.",
  );
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

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

const tools = [
  searchPagesDefinition,
  readDatabaseDefinition,
  createPageDefinition,
  queryDatabaseDefinition,
];

const handlers: Record<
  string,
  (
    notion: Client,
    args: Record<string, unknown>,
  ) => Promise<{ content: [{ type: "text"; text: string }] }>
> = {
  [searchPagesDefinition.name]: searchPagesHandler,
  [readDatabaseDefinition.name]: readDatabaseHandler,
  [createPageDefinition.name]: createPageHandler,
  [queryDatabaseDefinition.name]: queryDatabaseHandler,
};

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const handler = handlers[name];
  if (!handler) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Unknown tool: ${name}. Available tools: ${tools.map((t) => t.name).join(", ")}`,
        },
      ],
    };
  }

  return handler(notion, (args ?? {}) as Record<string, unknown>);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("WireForge Notion MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});
