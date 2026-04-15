# Anforderungsportal MCP Server

MCP (Model Context Protocol) server that exposes WMC Anforderungsportal tools to AI coding assistants like GitHub Copilot, Claude Desktop, and Cursor.

## Quick Start (one command)

```bash
npm install -g anforderungsportal-mcp
```

That's it. The installer automatically configures VS Code and Cursor.

Restart VS Code, open chat (`Ctrl+L`), and type:

```
login your-email@wamocon.com your-password
```

### Manual setup (if auto-setup didn't run)

```bash
# In any project folder:
npx anforderungsportal-mcp init

# Or to enable in ALL workspaces:
npx anforderungsportal-mcp init --global
```

> The Supabase URL and anon key are built into the package. No env vars needed.

## Admin Setup (local dev, full access)

For administrators who need god-mode access (bypasses RLS), add the service role key:

```json
{
  "servers": {
    "anforderungsportal": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://acgxydrisfjbilfgatkq.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

## Setup from Source

### 1. Install dependencies

```bash
cd mcp-server
npm install
npm run build
```

### 2. Add to your MCP client

**Claude Desktop** — add to `claude_desktop_config.json`:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "anforderungsportal": {
      "command": "npx",
      "args": ["-y", "anforderungsportal-mcp"]
    }
  }
}
```

**Cursor** — add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "anforderungsportal": {
      "command": "npx",
      "args": ["-y", "anforderungsportal-mcp"]
    }
  }
}
```

## Available Tools

### Authentication (v1.1.0+)
| Tool | Description |
|------|-------------|
| `login` | Sign in as a user (PO, Staff, Admin). Scopes all subsequent calls to that user's RLS policies |
| `whoami` | Check current auth status — logged-in user, role, session expiry |
| `logout` | Sign out, return to admin mode (service-role, RLS bypassed) |

### Project Management
| Tool | Description |
|------|-------------|
| `list_projects` | List projects with optional status filter |
| `get_project` | Get project details by ID or slug |
| `create_project` | Create a new draft project |
| `update_project` | Update project name, description, template |
| `submit_for_review` | Submit draft for staff review |
| `approve_project` | Approve a pending project (staff) |
| `reject_project` | Reject back to draft (staff) |
| `activate_project` | Activate for client filling (staff) |
| `archive_project` | Archive a project |

### Template Management
| Tool | Description |
|------|-------------|
| `list_templates` | List all requirement templates |
| `get_template` | Get template with sections & questions |
| `create_template` | Create a new template |
| `add_section` | Add section to a template |
| `add_question` | Add question to a section |

### Responses & Requirements
| Tool | Description |
|------|-------------|
| `list_responses` | List responses for a project |
| `get_response_answers` | Get answers for a response |
| `submit_answer` | Submit/update an answer |

### Members & Feedback
| Tool | Description |
|------|-------------|
| `list_project_members` | List members & invitations |
| `invite_member` | Invite client by email |
| `send_feedback` | Send feedback to responder |

### Analytics
| Tool | Description |
|------|-------------|
| `project_stats` | Get project statistics |
| `search_projects` | Search projects by name |

## Security

- **Admin mode** (default): Uses `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS, full access
- **User mode** (after `login`): Scoped by RLS policies for the logged-in user's role
- Use the `login` tool to switch between admin and user modes
- Never commit keys to version control (`.vscode/mcp.json` is gitignored)
- The server runs locally via stdio — no network exposure
- Search queries are sanitised against PostgREST filter injection

## Testing

```bash
cd mcp-server
npm test          # Run all 91 unit tests
npm run test:watch  # Watch mode
```
