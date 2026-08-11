# WireForge GitHub MCP Server

An MCP (Model Context Protocol) server that provides GitHub integration tools for AI assistants. List repositories, search issues, read pull request details, and create issues -- all through a standardized MCP interface.

Part of the [WireForge MCP Vertical Bundle](https://github.com/srmcguirt/mcp-vertical-bundle).

---

## Tools

| Tool | Description |
|------|-------------|
| `github_list_repos` | List repositories for the authenticated user or a specified user |
| `github_search_issues` | Search issues and pull requests with filters for repo, state, and labels |
| `github_read_pr` | Read pull request details, optionally including the diff and comments |
| `github_create_issue` | Create a new issue with title, body, labels, assignees, and milestone |

---

## Prerequisites

- Node.js 18+
- A GitHub personal access token with appropriate scopes (`repo` for private repos, `public_repo` for public-only access)

Generate a token at: https://github.com/settings/tokens

---

## Setup

```bash
cd servers/github-mcp
npm install
npm run build
```

Create a `.env` file (or set the environment variable directly in your MCP client config):

```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Client Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wireforge-github": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-vertical-bundle/servers/github-mcp/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

Config file locations:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json` in your project root or global settings):

```json
{
  "mcpServers": {
    "wireforge-github": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-vertical-bundle/servers/github-mcp/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
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
    "wireforge-github": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-vertical-bundle/servers/github-mcp/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      },
      "disabled": false
    }
  }
}
```

---

## Development

Run in development mode with automatic TypeScript compilation:

```bash
npm run dev
```

Build for production:

```bash
npm run build
npm start
```

---

## License

MIT -- WireForge
