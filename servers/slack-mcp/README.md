# WireForge Slack MCP Server

MCP server that connects Claude, Cursor, and other AI tools to Slack.

## Tools

| Tool | Description |
|------|-------------|
| `list_channels` | List channels the bot can see |
| `read_messages` | Read recent messages with optional thread replies |
| `post_message` | Send a message to a channel or thread |
| `list_users` | List workspace members |
| `search_messages` | Search messages across channels |

## Setup

1. Create a Slack App at https://api.slack.com/apps
2. Add Bot Token Scopes: `channels:read`, `channels:history`, `chat:write`, `users:read`
3. For search: add User Token Scope `search:read`
4. Install to workspace

```bash
cp .env.example .env
# Add your bot token to .env

npm install
npm run build
npm start
```

## Claude Desktop Config

```json
{
 "mcpServers": {
 "slack": {
 "command": "node",
 "args": ["/path/to/servers/slack-mcp/dist/index.js"],
 "env": {
 "SLACK_BOT_TOKEN": "xoxb-your-token-here"
 }
 }
 }
}
```
