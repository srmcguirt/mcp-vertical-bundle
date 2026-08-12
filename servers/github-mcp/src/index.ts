import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Octokit } from "@octokit/rest";

import { listReposSchema, listRepos } from "./tools/list-repos.js";
import { searchIssuesSchema, searchIssues } from "./tools/search-issues.js";
import { readPrSchema, readPr } from "./tools/read-pr.js";
import { createIssueSchema, createIssue } from "./tools/create-issue.js";
import {
  getFileContentsSchema,
  getFileContents,
} from "./tools/get-file-contents.js";

// Validate token
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error(
    "GITHUB_TOKEN environment variable is required. " +
      "Create a personal access token at https://github.com/settings/tokens",
  );
  process.exit(1);
}

// Initialize Octokit
const octokit = new Octokit({
  auth: token,
  userAgent: "srmcguirt-github-mcp/1.0.0",
});

// Tool definitions
const tools = [
  {
    name: "github_list_repos",
    description:
      "List repositories for the authenticated user or a specified user/organization. " +
      "Returns repo metadata including name, description, language, stars, forks, and visibility. " +
      "Supports filtering by type (all, owner, member, public) and sorting by created, updated, pushed, or name.",
    inputSchema: {
      type: "object" as const,
      properties: {
        owner: {
          type: "string",
          description:
            "GitHub username or organization. Defaults to authenticated user if omitted.",
        },
        type: {
          type: "string",
          enum: ["all", "owner", "member", "public"],
          description: 'Filter by repo type. Default: "all".',
        },
        sort: {
          type: "string",
          enum: ["created", "updated", "pushed", "full_name"],
          description: 'Sort field. Default: "updated".',
        },
        per_page: {
          type: "number",
          description: "Results per page (1-100). Default: 30.",
          minimum: 1,
          maximum: 100,
        },
        page: {
          type: "number",
          description: "Page number. Default: 1.",
          minimum: 1,
        },
      },
      required: [],
    },
  },
  {
    name: "github_search_issues",
    description:
      "Search GitHub issues and pull requests using GitHub search syntax. " +
      'Supports qualifiers like "is:open", "label:bug", "repo:owner/repo", etc. ' +
      "Returns issue metadata including number, title, state, author, labels, and a body preview.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            'Search query using GitHub search syntax (e.g., "is:open label:bug repo:owner/repo").',
        },
        sort: {
          type: "string",
          enum: ["created", "updated", "comments"],
          description: 'Sort field. Default: "updated".',
        },
        order: {
          type: "string",
          enum: ["asc", "desc"],
          description: 'Sort order. Default: "desc".',
        },
        per_page: {
          type: "number",
          description: "Results per page (1-100). Default: 20.",
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
  },
  {
    name: "github_read_pr",
    description:
      "Get detailed information about a pull request including diff stats, changed files, and reviews. " +
      "Returns PR metadata such as title, state, author, base/head branches, additions/deletions, " +
      "merge status, labels, and requested reviewers. Optionally includes file-level diffs and review comments.",
    inputSchema: {
      type: "object" as const,
      properties: {
        owner: {
          type: "string",
          description: "Repository owner.",
        },
        repo: {
          type: "string",
          description: "Repository name.",
        },
        pull_number: {
          type: "number",
          description: "Pull request number.",
        },
        include_files: {
          type: "boolean",
          description:
            "Include the list of changed files with diff previews. Default: true.",
        },
        include_reviews: {
          type: "boolean",
          description: "Include review comments. Default: false.",
        },
      },
      required: ["owner", "repo", "pull_number"],
    },
  },
  {
    name: "github_create_issue",
    description:
      "Create a new GitHub issue in a repository. " +
      "Supports setting title, body (markdown), labels, assignees, and milestone. " +
      "Returns the created issue number, URL, and metadata.",
    inputSchema: {
      type: "object" as const,
      properties: {
        owner: {
          type: "string",
          description: "Repository owner.",
        },
        repo: {
          type: "string",
          description: "Repository name.",
        },
        title: {
          type: "string",
          description: "Issue title.",
        },
        body: {
          type: "string",
          description: "Issue body (markdown supported).",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Labels to apply to the issue.",
        },
        assignees: {
          type: "array",
          items: { type: "string" },
          description: "GitHub usernames to assign.",
        },
        milestone: {
          type: "number",
          description: "Milestone number to assign.",
        },
      },
      required: ["owner", "repo", "title"],
    },
  },
  {
    name: "github_get_file_contents",
    description:
      "Read a file or directory listing from a GitHub repository. " +
      "Returns decoded file content for files, or a list of entries for directories. " +
      "Supports reading from any branch, tag, or commit SHA via the ref parameter.",
    inputSchema: {
      type: "object" as const,
      properties: {
        owner: {
          type: "string",
          description: "Repository owner.",
        },
        repo: {
          type: "string",
          description: "Repository name.",
        },
        path: {
          type: "string",
          description:
            "Path to file or directory. Empty string for the repo root. Default: ''.",
        },
        ref: {
          type: "string",
          description:
            "Git ref (branch, tag, or commit SHA). Defaults to the default branch.",
        },
      },
      required: ["owner", "repo"],
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: "srmcguirt-github",
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
    switch (name) {
      case "github_list_repos": {
        const validated = listReposSchema.parse(args);
        const result = await listRepos(octokit, validated);
        return { content: [{ type: "text" as const, text: result }] };
      }

      case "github_search_issues": {
        const validated = searchIssuesSchema.parse(args);
        const result = await searchIssues(octokit, validated);
        return { content: [{ type: "text" as const, text: result }] };
      }

      case "github_read_pr": {
        const validated = readPrSchema.parse(args);
        const result = await readPr(octokit, validated);
        return { content: [{ type: "text" as const, text: result }] };
      }

      case "github_create_issue": {
        const validated = createIssueSchema.parse(args);
        const result = await createIssue(octokit, validated);
        return { content: [{ type: "text" as const, text: result }] };
      }

      case "github_get_file_contents": {
        const validated = getFileContentsSchema.parse(args);
        const result = await getFileContents(octokit, validated);
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
  console.error("GitHub MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});
