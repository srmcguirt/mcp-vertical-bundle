# @srmcguirt/mcp-vertical-bundle

[![CI](https://github.com/srmcguirt/mcp-vertical-bundle/actions/workflows/ci.yml/badge.svg)](https://github.com/srmcguirt/mcp-vertical-bundle/actions/workflows/ci.yml) ![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white) ![Node](https://img.shields.io/badge/Node-%3E%3D18-339933?logo=node.js&logoColor=white) ![MCP](https://img.shields.io/badge/MCP-Compatible-8A2BE2) ![Servers](https://img.shields.io/badge/Servers-3-green)

3 production-ready MCP servers that connect Claude, Cursor, and any MCP client to **GitHub**, **Slack**, and **Notion** -- ready to deploy in under 5 minutes.

```
┌─────────────────────────────────────────────────────────┐
│                   MCP Vertical Bundle                   │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  GitHub MCP  │  │  Slack MCP  │  │ Notion MCP  │     │
│  │             │  │             │  │             │     │
│  │ 5 tools     │  │ 5 tools     │  │ 5 tools     │     │
│  │ list_repos  │  │ list_chan.  │  │ search_pg.  │     │
│  │ search_iss. │  │ read_msgs  │  │ read_page   │     │
│  │ read_pr     │  │ post_msg   │  │ query_db    │     │
│  │ create_iss. │  │ list_users │  │ create_pg   │     │
│  │ get_file    │  │ search_msg │  │ list_dbs    │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          │                              │
│              ┌───────────┴───────────┐                  │
│              │  @modelcontextprotocol │                  │
│              │       /sdk            │                  │
│              └───────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

## What You Get

- **15 MCP tools** across 3 servers -- every tool uses Zod validation and proper error handling
- **Real API integrations** -- not stubs. Uses `@octokit/rest`, `@slack/web-api`, `@notionhq/client`
- **Stdio transport** -- works with Claude Desktop, Cursor, Cline, and any MCP-compatible client
- **Docker support** -- `docker compose up` runs all 3 servers
- **TypeScript strict mode** -- full type safety, declaration files, source maps

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/srmcguirt/mcp-vertical-bundle.git
cd mcp-vertical-bundle
npm install
```

### 2. Configure API keys

```bash
# GitHub
cp servers/github-mcp/.env.example servers/github-mcp/.env
# Edit: add your GitHub Personal Access Token

# Slack
cp servers/slack-mcp/.env.example servers/slack-mcp/.env
# Edit: add your Slack Bot Token

# Notion
cp servers/notion-mcp/.env.example servers/notion-mcp/.env
# Edit: add your Notion Integration Token
```

### 3. Build

```bash
npm run build  # Builds all 3 servers
```

### 4. Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["<path>/servers/github-mcp/dist/index.js"],
      "env": { "GITHUB_TOKEN": "ghp_..." }
    },
    "slack": {
      "command": "node",
      "args": ["<path>/servers/slack-mcp/dist/index.js"],
      "env": { "SLACK_BOT_TOKEN": "xoxb-..." }
    },
    "notion": {
      "command": "node",
      "args": ["<path>/servers/notion-mcp/dist/index.js"],
      "env": { "NOTION_API_KEY": "secret_..." }
    }
  }
}
```

### 5. Use with Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["<path>/servers/github-mcp/dist/index.js"],
      "env": { "GITHUB_TOKEN": "ghp_..." }
    }
  }
}
```

---

## Servers

### GitHub MCP Server

Connect AI to your GitHub repos, issues, and pull requests.

| Tool | Description |
|------|-------------|
| `list_repos` | List repos by user/org with stars, language, activity |
| `search_issues` | Full GitHub search syntax (`is:open label:bug repo:...`) |
| `read_pr` | PR details, changed files, diff stats, reviews |
| `create_issue` | Create issues with labels, assignees, milestones |
| `get_file_contents` | Read files or directory listings from any branch |

**Token**: [github.com/settings/tokens](https://github.com/settings/tokens) -- scopes: `repo`, `read:org`

### Slack MCP Server

Connect AI to your Slack workspace.

| Tool | Description |
|------|-------------|
| `list_channels` | Channels with topic, purpose, member count |
| `read_messages` | Recent messages with optional thread replies |
| `post_message` | Send messages with mrkdwn formatting |
| `list_users` | Workspace members with roles, timezone, status |
| `search_messages` | Cross-channel search with Slack modifiers |

**Token**: [api.slack.com/apps](https://api.slack.com/apps) -- scopes: `channels:read`, `channels:history`, `chat:write`, `users:read`, `search:read`

### Notion MCP Server

Connect AI to your Notion workspace.

| Tool | Description |
|------|-------------|
| `search_pages` | Search pages/databases by title or content |
| `read_page` | Page content as text (headings, lists, code, todos) |
| `query_database` | Query with filters and sorts, returns typed values |
| `create_page` | Create pages in databases or under pages |
| `list_databases` | Databases with their property schemas |

**Token**: [notion.so/my-integrations](https://www.notion.so/my-integrations) -- share pages with your integration

---

## Docker

Run all 3 servers with Docker Compose:

```bash
# Build and start
docker compose up -d

# Check status
docker compose ps

# Stop
docker compose down
```

---

## Project Structure

```
mcp-vertical-bundle/
  docker-compose.yml        # Run all servers
  package.json              # Workspace root
  servers/
    github-mcp/
      src/
        index.ts            # MCP server entry point
        tools/
          list-repos.ts
          search-issues.ts
          read-pr.ts
          create-issue.ts
          get-file-contents.ts
      package.json
      .env.example
      Dockerfile
    slack-mcp/
      src/
        index.ts
        tools/
          list-channels.ts
          read-messages.ts
          post-message.ts
          list-users.ts
          search-messages.ts
      package.json
      .env.example
      Dockerfile
    notion-mcp/
      src/
        index.ts
        tools/
          search-pages.ts
          read-page.ts
          query-database.ts
          create-page.ts
          list-databases.ts
      package.json
      .env.example
      Dockerfile
```

---

## Extending

Each server follows the same pattern. To add a new tool:

```typescript
// 1. Define the schema with Zod
export const myToolSchema = z.object({
  param: z.string().describe('What this param does'),
});

// 2. Implement the handler
export async function myTool(client: ApiClient, input: MyToolInput): Promise<string> {
  const result = await client.doSomething(input.param);
  return JSON.stringify(result);
}

// 3. Register with the MCP server (in index.ts)
server.tool('my_tool', 'Description', myToolSchema.shape, async (args) => {
  const input = myToolSchema.parse(args);
  const result = await myTool(client, input);
  return { content: [{ type: 'text', text: result }] };
});
```

---

---

## 💼 Get the Full Bundle

This repo contains the open-source core. The full **MCP Vertical Server Bundle** on Gumroad includes:
- All 3 production MCP servers (GitHub, Slack, Notion) — 15 tools, Zod-validated
- Multi-server Docker Compose orchestration
- Extended configuration guide + Claude Desktop / Cursor setup
- MIT licensed — use in any project

**[$99 on Gumroad → srmcguirt.gumroad.com/l/mcp-vertical-bundle](https://srmcguirt.gumroad.com/l/mcp-vertical-bundle)**

Related tools:
- [MCP Server Starter Kit](https://srmcguirt.gumroad.com/l/mcp-starter) — build your own MCP server (TypeScript, free core)
- [FastMCP Python Boilerplate](https://srmcguirt.gumroad.com/l/fastmcp-python) — Python MCP server with rate limiting ($35)
- [Multi-Agent Orchestration Kit](https://srmcguirt.gumroad.com/l/multi-agent-kit) — pipeline, fan-out, supervisor patterns ($79)
- [Claude Agent Boilerplate](https://srmcguirt.gumroad.com/l/claude-agent) — tool-use loop with memory + streaming ($29)

→ Full lineup: [srmcguirt.dev](https://srmcguirt.dev)


## License

MIT -- see [LICENSE](./LICENSE).

Built by [Shane McGuirt](https://srmcguirt.gumroad.com/l/mcp-vertical-bundle).
