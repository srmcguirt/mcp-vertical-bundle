# Changelog

All notable changes to the MCP Vertical Server Bundle.

## [1.0.0] — 2026-08-11

### Added

**GitHub MCP Server**
- `list_repos` — List repositories for user/org with metadata (stars, language, activity)
- `search_issues` — Full GitHub search syntax support for issues and PRs
- `read_pr` — PR details, changed files with patch previews, review comments
- `create_issue` — Create issues with labels, assignees, milestones
- `get_file_contents` — Read files (base64-decoded) or directory listings from any branch

**Slack MCP Server**
- `list_channels` — List channels with topic, purpose, member count
- `read_messages` — Read channel history with optional thread replies
- `post_message` — Send messages with Slack mrkdwn formatting, thread support
- `list_users` — List workspace members with roles, timezone, status
- `search_messages` — Cross-channel search with Slack modifiers (from:, in:, has:)

**Notion MCP Server**
- `search_pages` — Search pages and databases by title/content
- `read_page` — Page content converted to readable text (headings, lists, code, todos, callouts)
- `query_database` — Query with property filters and sorts, typed value extraction
- `create_page` — Create pages in databases or under pages with markdown-like content
- `list_databases` — List databases with property schemas

**Infrastructure**
- Docker Compose configuration for running all 3 servers
- TypeScript strict mode across all servers
- Zod schema validation on all tool inputs
- Proper error handling with user-friendly messages
- Per-server READMEs with Claude Desktop and Cursor configuration examples
