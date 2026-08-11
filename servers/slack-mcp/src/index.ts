import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { WebClient } from "@slack/web-api";

import {
  toolDefinition as searchChannelsDefinition,
  handler as searchChannelsHandler,
} from "./tools/search-channels.js";
import {
  toolDefinition as readMessagesDefinition,
  handler as readMessagesHandler,
} from "./tools/read-messages.js";
import {
  toolDefinition as postMessageDefinition,
  handler as postMessageHandler,
} from "./tools/post-message.js";
import {
  toolDefinition as listUsersDefinition,
  handler as listUsersHandler,
} from "./tools/list-users.js";

// Load environment variables
dotenv.config();

// Validate token
const token = process.env.SLACK_BOT_TOKEN;
if (!token) {
  console.error(
    "SLACK_BOT_TOKEN environment variable is required. " +
      "Create a Slack app and bot token at https://api.slack.com/apps",
  );
  process.exit(1);
}

// Initialize Slack client
const client = new WebClient(token);

// Tool registry
const tools = [
  searchChannelsDefinition,
  readMessagesDefinition,
  postMessageDefinition,
  listUsersDefinition,
];

const handlers: Record<
  string,
  (
    client: WebClient,
    args: Record<string, unknown>,
  ) => Promise<{ content: [{ type: "text"; text: string }] }>
> = {
  [searchChannelsDefinition.name]: searchChannelsHandler,
  [readMessagesDefinition.name]: readMessagesHandler,
  [postMessageDefinition.name]: postMessageHandler,
  [listUsersDefinition.name]: listUsersHandler,
};

// Create MCP server
const server = new Server(
  {
    name: "wireforge-slack",
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

  const handler = handlers[name];
  if (!handler) {
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

  try {
    return await handler(client, args ?? {});
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
  console.error("WireForge Slack MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});
