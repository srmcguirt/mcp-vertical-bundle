# WireForge GitHub MCP Server

MCP server that connects Claude, Cursor, and other AI tools to GitHub.

## Tools

| Tool | Description |
|------|-------------|
| `list_repos` | List repositories for a user/org |
| `search_issues` | Search issues and PRs with GitHub query syntax |
| `read_pr` | Get PR details, changed files, and reviews |
| `create_issue` | Create a new issue with labels and assignees |
| `get_file_contents` | Read files or directory listings from repos |

## Setup

1. Create a GitHub Personal Access Token at https://github.com/settings/tokens
2. Required scopes: `repo`, `read:org`, `read:user`

```bash
cp .env.example .env
# Add your token to .env

npm install
npm run build
npm start
```

## Claude Desktop Config

```json
{
 "mcpServers": {
 "github": {
 "command": "node",
 "args": ["/path/to/servers/github-mcp/dist/index.js"],
 "env": {
 "GITHUB_TOKEN": "ghp_your_token_here"
 }
 }
 }
}
```
