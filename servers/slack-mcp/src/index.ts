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
import {
  listChannelsSchema,
  listChannels,
} from "./tools/list-channels.js";
import {
  searchMessagesSchema,
  searchMessages,
} from "./tools/search-messages.js";

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

// Additional tool definitions for tools that use Zod-schema exports
const listChannelsDefinition = {
  name: "slack_list_channels",
  description:
    "List Slack channels the bot has access to. " +
    "Returns channel metadata including ID, name, topic, purpose, member count, and privacy/archive status. " +
    "Supports filtering by channel type and pagination via cursor.",
  inputSchema: {
    type: "object" as const,
    properties: {
      types: {
        type: "string",
        description:
          'Comma-separated channel types: public_channel, private_channel, mpim, im. Default: "public_channel".',
      },
      limit: {
        type: "number",
        description: "Max channels to return (1-200). Default: 50.",
        minimum: 1,
        maximum: 200,
      },
      cursor: {
        type: "string",
        description: "Pagination cursor from a previous response.",
      },
      exclude_archived: {
        type: "boolean",
        description: "Exclude archived channels. Default: true.",
      },
    },
    required: [],
  },
};

const searchMessagesDefinition = {
  name: "slack_search_messages",
  description:
    "Search Slack messages across channels. " +
    "Supports Slack search modifiers (from:, in:, has:, before:, after:). " +
    "Note: requires a user token (xoxp-) with search:read scope. " +
    "Returns matching messages with text, user, channel, and permalink.",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "Search query. Supports Slack search modifiers (from:, in:, has:, before:, after:).",
      },
      sort: {
        type: "string",
        enum: ["score", "timestamp"],
        description: 'Sort by relevance or recency. Default: "score".',
      },
      sort_dir: {
        type: "string",
        enum: ["asc", "desc"],
        description: 'Sort direction. Default: "desc".',
      },
      count: {
        type: "number",
        description: "Number of results to return (1-100). Default: 20.",
        minimum: 1,
        maximum: 100,
      },
      page: {
        type: "number",
        description: "Page number. Default: 1.",
        minimum: 1,
      },
    },
    required: ["query"],
  },
};

// Tool registry
const tools = [
  searchChannelsDefinition,
  readMessagesDefinition,
  postMessageDefinition,
  listUsersDefinition,
  listChannelsDefinition,
  searchMessagesDefinition,
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

  try {
    // Check registry-based handlers first
    const registeredHandler = handlers[name];
    if (registeredHandler) {
      return await registeredHandler(client, args ?? {});
    }

    // Handle Zod-schema-based tools
    switch (name) {
      case "slack_list_channels": {
        const validated = listChannelsSchema.parse(args);
        const result = await listChannels(client, validated);
        return { content: [{ type: "text" as const, text: result }] };
      }

      case "slack_search_messages": {
        const validated = searchMessagesSchema.parse(args);
        const result = await searchMessages(client, validated);
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
  console.error("WireForge Slack MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});
