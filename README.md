# WireForge MCP Vertical Server Bundle

**Three production-ready MCP servers. Drop-in ready for Claude Desktop, Cursor, and Cline.**

The WireForge MCP Vertical Server Bundle gives you fully typed, validated, and documented Model Context Protocol servers for the three platforms your team uses every day: GitHub, Slack, and Notion. Each server is built with TypeScript, validated with Zod, and designed to work out of the box with any MCP-compatible client.

No boilerplate. No guesswork. Install, configure your API tokens, and start using AI-powered workflows across your entire stack.

---

## Architecture

```
+------------------------------------------------------------------+
|                        MCP Client                                |
|              (Claude Desktop / Cursor / Cline)                   |
+----------+-------------------+-------------------+---------------+
           |                   |                   |
         stdio               stdio               stdio
           |                   |                   |
+----------v------+  +--------v--------+  +-------v---------+
|  GitHub MCP     |  |  Slack MCP      |  |  Notion MCP     |
|  Server         |  |  Server         |  |  Server         |
|                 |  |                 |  |                 |
|  - list_repos   |  |  - search       |  |  - search_pages |
|  - search_issues|  |    _channels    |  |  - read_database|
|  - read_pr      |  |  - read_messages|  |  - create_page  |
|  - create_issue |  |  - post_message |  |  - query        |
|                 |  |  - list_users   |  |    _database    |
+---------+-------+  +--------+--------+  +--------+--------+
          |                    |                    |
          v                    v                    v
     GitHub API           Slack API           Notion API
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Build all servers

```bash
npm run build
```

Or build individually:

```bash
npm run build:github
npm run build:slack
npm run build:notion
```

### 3. Configure environment variables

Each server requires its own API token. Copy the example env file in each server directory and add your credentials:

```bash
cp servers/github-mcp/.env.example servers/github-mcp/.env
cp servers/slack-mcp/.env.example servers/slack-mcp/.env
cp servers/notion-mcp/.env.example servers/notion-mcp/.env
```

Edit each `.env` file with your API tokens:

- **GitHub**: Personal access token with `repo` scope
- **Slack**: Bot token (`xoxb-`) with appropriate scopes
- **Notion**: Internal integration token

### 4. Connect to your MCP client

See the configuration examples below for Claude Desktop, Cursor, and Cline.

---

## Servers

### GitHub MCP Server

Interact with GitHub repositories, issues, and pull requests directly from your AI assistant.

**Tools:** `list_repos`, `search_issues`, `read_pr`, `create_issue`

See [servers/github-mcp/README.md](servers/github-mcp/README.md) for full documentation.

### Slack MCP Server

Search, read, and post messages across your Slack workspace without leaving your editor.

**Tools:** `search_channels`, `read_messages`, `post_message`, `list_users`

See [servers/slack-mcp/README.md](servers/slack-mcp/README.md) for full documentation.

### Notion MCP Server

Query databases, search pages, and create content in your Notion workspace programmatically.

**Tools:** `search_pages`, `read_database`, `create_page`, `query_database`

See [servers/notion-mcp/README.md](servers/notion-mcp/README.md) for full documentation.

---

## Client Configuration

### Claude Desktop

Add the following to your Claude Desktop configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "wireforge-github": {
      "command": "node",
      "args": ["servers/github-mcp/dist/index.js"],
      "cwd": "/path/to/mcp-vertical-bundle",
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    },
    "wireforge-slack": {
      "command": "node",
      "args": ["servers/slack-mcp/dist/index.js"],
      "cwd": "/path/to/mcp-vertical-bundle",
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-token-here"
      }
    },
    "wireforge-notion": {
      "command": "node",
      "args": ["servers/notion-mcp/dist/index.js"],
      "cwd": "/path/to/mcp-vertical-bundle",
      "env": {
        "NOTION_TOKEN": "ntn_your_token_here"
      }
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json` in your project root or global settings):

```json
{
  "mcpServers": {
    "wireforge-github": {
      "command": "node",
      "args": ["/path/to/mcp-vertical-bundle/servers/github-mcp/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    },
    "wireforge-slack": {
      "command": "node",
      "args": ["/path/to/mcp-vertical-bundle/servers/slack-mcp/dist/index.js"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-token-here"
      }
    },
    "wireforge-notion": {
      "command": "node",
      "args": ["/path/to/mcp-vertical-bundle/servers/notion-mcp/dist/index.js"],
      "env": {
        "NOTION_TOKEN": "ntn_your_token_here"
      }
    }
  }
}
```

### Cline

Add to your Cline MCP settings (accessible via Cline settings panel in VS Code):

```json
{
  "mcpServers": {
    "wireforge-github": {
      "command": "node",
      "args": ["/path/to/mcp-vertical-bundle/servers/github-mcp/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    },
    "wireforge-slack": {
      "command": "node",
      "args": ["/path/to/mcp-vertical-bundle/servers/slack-mcp/dist/index.js"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-token-here"
      }
    },
    "wireforge-notion": {
      "command": "node",
      "args": ["/path/to/mcp-vertical-bundle/servers/notion-mcp/dist/index.js"],
      "env": {
        "NOTION_TOKEN": "ntn_your_token_here"
      }
    }
  }
}
```

---

## Requirements

- **Node.js** 18 or later
- **npm** 9 or later
- **API Tokens** for each service you intend to use:
  - GitHub: [Create a personal access token](https://github.com/settings/tokens)
  - Slack: [Create a Slack app and bot token](https://api.slack.com/apps)
  - Notion: [Create an internal integration](https://www.notion.so/my-integrations)

You do not need all three tokens to get started. Each server operates independently -- configure only the ones you need.

---

## Docker (Optional)

A `docker-compose.yml` is included for building and testing the servers in containers. Note that MCP servers communicate via stdio, so Docker is primarily useful for CI and build verification rather than production use.

```bash
docker compose build
```

See the comments in `docker-compose.yml` for details.

---

## License

MIT License. Copyright 2024 WireForge. See [LICENSE](LICENSE) for details.
