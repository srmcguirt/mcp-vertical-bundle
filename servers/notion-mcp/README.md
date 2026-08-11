# WireForge Notion MCP Server

A production-ready MCP server that connects Claude, Cursor, and Cline to the Notion API.

## Tools

| Tool | Description |
|------|-------------|
| `search_pages` | Search Notion pages and databases by title or content |
| `read_database` | Read database schema, properties, and entries |
| `create_page` | Create new pages in databases or as sub-pages |
| `query_database` | Query databases with filters, sorts, and pagination |

## Setup

### 1. Create a Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"New integration"**
3. Give it a name (e.g., "WireForge MCP")
4. Select the workspace
5. Copy the **Internal Integration Secret**

### 2. Share Pages with the Integration

In Notion, open any page or database you want accessible, click **"..."** → **"Connections"** → add your integration.

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your Notion API key
```

### 4. Install & Build

```bash
npm install
npm run build
```

### 5. Add to Claude Desktop

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["/path/to/servers/notion-mcp/dist/index.js"],
      "env": {
        "NOTION_API_KEY": "secret_your_key_here"
      }
    }
  }
}
```

### Cursor / Cline

Same config format — add to your MCP server settings.

## License

MIT — WireForge
