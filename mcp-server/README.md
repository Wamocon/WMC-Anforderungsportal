# Anforderungsportal MCP Server

MCP (Model Context Protocol) server that exposes WMC Anforderungsportal tools to AI coding assistants like GitHub Copilot, Claude Desktop, and Cursor.

## Setup

### 1. Install dependencies

```bash
cd mcp-server
npm install
npm run build
```

### 2. Configure environment

Set these environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Staff | Service role key (full access) |
| `SUPABASE_ANON_KEY` | PO | Anon key (RLS-scoped access) |

### 3. Add to your MCP client

**VS Code (Copilot / Claude Dev)** — add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "anforderungsportal": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://acgxydrisfjbilfgatkq.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

**Claude Desktop** — add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "anforderungsportal": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://acgxydrisfjbilfgatkq.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## Available Tools

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

- **Staff mode**: Uses `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS, full access
- **PO mode**: Uses `SUPABASE_ANON_KEY` — all queries scoped by RLS policies
- Never commit keys to version control
- The server runs locally via stdio — no network exposure
