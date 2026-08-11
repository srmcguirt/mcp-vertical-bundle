# @wireforge/mcp-slack

Production-ready MCP server for Slack integration. Search channels, read messages, post messages, and list users -- all through the Model Context Protocol.

Part of the [WireForge MCP Vertical Bundle](https://github.com/srmcguirt/mcp-vertical-bundle).

---

## Tools

| Tool | Description |
|------|-------------|
| `slack_search_channels` | Search and list Slack channels with optional filtering by name, topic, or purpose |
| `slack_read_messages` | Read messages from a channel with user name resolution, time-range filtering, and thread/reaction metadata |
| `slack_post_message` | Post a message to a channel or thread with unfurl controls |
| `slack_list_users` | List workspace members with profile details, status, and optional bot inclusion |

---

## Prerequisites

### Slack Bot Token

Create a Slack App at [api.slack.com/apps](https://api.slack.com/apps) and add a Bot User with the following OAuth scopes:

| Scope | Required for |
|-------|-------------|
| `channels:read` | `slack_search_channels` -- list and search public channels |
| `groups:read` | `slack_search_channels` -- list and search private channels |
| `channels:history` | `slack_read_messages` -- read public channel messages |
| `groups:history` | `slack_read_messages` -- read private channel messages |
| `chat:write` | `slack_post_message` -- send messages to channels |
| `users:read` | `slack_list_users`, `slack_read_messages` -- resolve user IDs to names |
| `users:read.email` | `slack_list_users` -- include user email addresses |

Install the app to your workspace and copy the **Bot User OAuth Token** (starts with `xoxb-`).

---

## Setup

### 1. Install dependencies

```bash
cd servers/slack-mcp
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your Slack Bot Token:

```
SLACK_BOT_TOKEN=xoxb-your-token-here
```

### 3. Build

```bash
npm run build
```

---

## Client Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wireforge-slack": {
      "command": "node",
      "args": ["<absolute-path-to>/mcp-vertical-bundle/servers/slack-mcp/dist/index.js"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-token-here"
      }
    }
  }
}
```

Config file locations:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json` in your project root or global settings):

```json
{
  "mcpServers": {
    "wireforge-slack": {
      "command": "node",
      "args": ["<absolute-path-to>/mcp-vertical-bundle/servers/slack-mcp/dist/index.js"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-token-here"
      }
    }
  }
}
```

### Cline

Add to your Cline MCP settings (`cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "wireforge-slack": {
      "command": "node",
      "args": ["<absolute-path-to>/mcp-vertical-bundle/servers/slack-mcp/dist/index.js"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-token-here"
      }
    }
  }
}
```

---

## Development

Run the server in development mode with hot reload:

```bash
npm run dev
```

---

## License

MIT -- WireForge
