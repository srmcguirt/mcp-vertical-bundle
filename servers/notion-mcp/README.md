# WireForge Notion MCP Server

An MCP (Model Context Protocol) server that provides Notion integration tools for AI assistants. Search pages, read database schemas, create pages, and query databases with filters -- all through a standardized MCP interface.

Part of the [MCP Vertical Bundle](https://github.com/srmcguirt/mcp-vertical-bundle).

---

## Tools

| Tool | Description |
|------|-------------|
| `notion_search_pages` | Search across all pages and databases in the workspace by title or content |
| `notion_read_database` | Read a database's schema, properties, and configuration |
| `notion_create_page` | Create a page as a child of a page or as a database entry with properties |
| `notion_query_database` | Query a database with filters, sorts, and pagination |

---

## Prerequisites

- Node.js 18+
- A Notion Internal Integration Token

### Creating a Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration**
3. Name your integration and select the workspace
4. Under **Capabilities**, ensure the following are enabled:
 - Read content
 - Insert content
 - Update content (optional, for future use)
5. Copy the **Internal Integration Secret** (`secret_...`)
6. **Share pages/databases** with your integration:
 - Open any page or database in Notion
 - Click the **...** menu > **Connections** > select your integration
 - The integration can only access pages explicitly shared with it

---

## Setup

```bash
cd servers/notion-mcp
npm install
npm run build
```

Create a `.env` file (or set the environment variable directly in your MCP client config):

```
NOTION_API_KEY=secret_your_key_here
```

---

## Client Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
 "mcpServers": {
 "srmcguirt-notion": {
 "command": "node",
 "args": ["/absolute/path/to/mcp-vertical-bundle/servers/notion-mcp/dist/index.js"],
 "env": {
 "NOTION_API_KEY": "secret_your_key_here"
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
 "srmcguirt-notion": {
 "command": "node",
 "args": ["/absolute/path/to/mcp-vertical-bundle/servers/notion-mcp/dist/index.js"],
 "env": {
 "NOTION_API_KEY": "secret_your_key_here"
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
 "srmcguirt-notion": {
 "command": "node",
 "args": ["/absolute/path/to/mcp-vertical-bundle/servers/notion-mcp/dist/index.js"],
 "env": {
 "NOTION_API_KEY": "secret_your_key_here"
 },
 "disabled": false
 }
 }
}
```

---

## Usage Examples

### Search for pages

Ask your AI assistant:
> "Search Notion for pages about Q3 planning"

### Read a database schema

> "Show me the properties of the Tasks database"

### Create a page in a database

> "Create a new task in the Tasks database: title 'Fix login bug', status 'In Progress', priority 1"

### Query with filters

> "Show me all tasks in the database that are marked as Done and were created this month"

---

## Development

Run in development mode:

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
