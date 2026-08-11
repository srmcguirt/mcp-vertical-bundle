#!/usr/bin/env node

/**
 * WireForge GitHub MCP Server
 *
 * Exposes GitHub operations as MCP tools for Claude, Cursor, and other MCP clients.
 *
 * Tools:
 *   - list_repos     — List repositories for a user/org
 *   - search_issues   — Search issues and PRs with GitHub query syntax
 *   - read_pr         — Get PR details, files, and reviews
 *   - create_issue    — Create a new issue
 *   - get_file_contents — Read files or directory listings from repos
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_... node dist/index.js
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Octokit } from '@octokit/rest';

import { listReposSchema, listRepos } from './tools/list-repos.js';
import { searchIssuesSchema, searchIssues } from './tools/search-issues.js';
import { readPrSchema, readPr } from './tools/read-pr.js';
import { createIssueSchema, createIssue } from './tools/create-issue.js';
import { getFileContentsSchema, getFileContents } from './tools/get-file-contents.js';

// ─── Configuration ──────────────────────────────────────────────────────────

const GITHUB_TOKEN = process.env['GITHUB_TOKEN'];

if (!GITHUB_TOKEN) {
  console.error('Error: GITHUB_TOKEN environment variable is required.');
  console.error('Create a token at: https://github.com/settings/tokens');
  process.exit(1);
}

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
  userAgent: 'WireForge-GitHub-MCP/1.0',
});

// ─── MCP Server ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'wireforge-github',
  version: '1.0.0',
});

// Tool: list_repos
server.tool(
  'list_repos',
  'List GitHub repositories for a user, org, or the authenticated user. Returns name, description, language, stars, and recent activity.',
  listReposSchema.shape,
  async (args) => {
    try {
      const input = listReposSchema.parse(args);
      const result = await listRepos(octokit, input);
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: search_issues
server.tool(
  'search_issues',
  'Search GitHub issues and pull requests using GitHub search syntax. Supports filters like is:open, label:bug, repo:owner/repo.',
  searchIssuesSchema.shape,
  async (args) => {
    try {
      const input = searchIssuesSchema.parse(args);
      const result = await searchIssues(octokit, input);
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: read_pr
server.tool(
  'read_pr',
  'Get detailed information about a pull request including diff stats, changed files, and review comments.',
  readPrSchema.shape,
  async (args) => {
    try {
      const input = readPrSchema.parse(args);
      const result = await readPr(octokit, input);
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: create_issue
server.tool(
  'create_issue',
  'Create a new GitHub issue with title, body, labels, and assignees.',
  createIssueSchema.shape,
  async (args) => {
    try {
      const input = createIssueSchema.parse(args);
      const result = await createIssue(octokit, input);
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: get_file_contents
server.tool(
  'get_file_contents',
  'Read a file or directory listing from a GitHub repository. Returns file content (base64-decoded) or directory entries.',
  getFileContentsSchema.shape,
  async (args) => {
    try {
      const input = getFileContentsSchema.parse(args);
      const result = await getFileContents(octokit, input);
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// ─── Start ──────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('WireForge GitHub MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
