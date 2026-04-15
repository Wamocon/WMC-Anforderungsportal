/**
 * Setup helpers — create MCP config for VS Code, Cursor, or Claude Desktop.
 * Used by both the `init` CLI command and the postinstall script.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir, platform } from 'node:os';

const SERVER_CONFIG = {
  command: 'npx' as const,
  args: ['-y', 'anforderungsportal-mcp'] as const,
};

// ── VS Code settings.json locations (all editors) ─────────────
function getEditorSettingsDirs(): { editor: string; dir: string }[] {
  const home = homedir();
  const p = platform();
  const results: { editor: string; dir: string }[] = [];

  const editors = [
    { name: 'VS Code', folder: 'Code' },
    { name: 'VS Code Insiders', folder: 'Code - Insiders' },
    { name: 'Cursor', folder: 'Cursor' },
  ];

  for (const { name, folder } of editors) {
    let dir: string;
    if (p === 'win32') {
      dir = join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), folder, 'User');
    } else if (p === 'darwin') {
      dir = join(home, 'Library', 'Application Support', folder, 'User');
    } else {
      dir = join(home, '.config', folder, 'User');
    }
    if (existsSync(dir)) {
      results.push({ editor: name, dir });
    }
  }
  return results;
}

// ── Strip JSONC comments so we can parse settings.json ────────
function stripJsonComments(text: string): string {
  // Remove single-line comments (but not inside strings)
  let result = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { result += ch; escape = false; continue; }
    if (ch === '\\' && inString) { result += ch; escape = true; continue; }
    if (ch === '"' && !inString) { inString = true; result += ch; continue; }
    if (ch === '"' && inString) { inString = false; result += ch; continue; }
    if (!inString && ch === '/' && text[i + 1] === '/') {
      // Skip to end of line
      while (i < text.length && text[i] !== '\n') i++;
      result += '\n';
      continue;
    }
    if (!inString && ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i++; // skip the closing /
      continue;
    }
    result += ch;
  }
  // Remove trailing commas before } or ]
  return result.replace(/,(\s*[}\]])/g, '$1');
}

// ── Inject into VS Code user settings.json ────────────────────
export function addToVSCodeSettings(settingsDir: string): boolean | 'already' {
  const settingsPath = join(settingsDir, 'settings.json');

  if (existsSync(settingsPath)) {
    const raw = readFileSync(settingsPath, 'utf-8');

    // Already configured?
    if (raw.includes('"anforderungsportal"')) return 'already';

    // Backup before modifying
    try {
      copyFileSync(settingsPath, settingsPath + '.pre-anforderungsportal.bak');
    } catch { /* best effort */ }

    // Surgical injection — find the last `}` in the file (root object closing brace)
    // and insert the mcp.servers block right before it.
    // This preserves ALL comments, formatting, duplicate keys, etc.
    const injection = `  "mcp": {\n    "servers": {\n      "anforderungsportal": {\n        "command": "npx",\n        "args": ["-y", "anforderungsportal-mcp"]\n      }\n    }\n  }`;

    const lastBrace = raw.lastIndexOf('}');
    if (lastBrace === -1) return false;

    // Check if there's content before the brace (need a comma)
    const beforeBrace = raw.substring(0, lastBrace).trimEnd();
    const needsComma = beforeBrace.length > 0 && !beforeBrace.endsWith('{') && !beforeBrace.endsWith(',');

    const patched =
      beforeBrace +
      (needsComma ? ',' : '') +
      '\n' + injection + '\n' +
      raw.substring(lastBrace); // includes the closing }

    writeFileSync(settingsPath, patched, 'utf-8');
    return true;
  }

  // No settings.json yet — create one
  const config = {
    mcp: {
      servers: {
        anforderungsportal: SERVER_CONFIG,
      },
    },
  };
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  return true;
}

// ── Create .vscode/mcp.json in a workspace ────────────────────
export function createWorkspaceMcp(projectDir: string): boolean | 'already' {
  const vscodeDir = join(projectDir, '.vscode');
  const mcpPath = join(vscodeDir, 'mcp.json');

  if (existsSync(mcpPath)) {
    try {
      const existing = JSON.parse(readFileSync(mcpPath, 'utf-8'));
      if (existing?.servers?.anforderungsportal) return 'already';
      if (!existing.servers) existing.servers = {};
      existing.servers.anforderungsportal = SERVER_CONFIG;
      writeFileSync(mcpPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
      return true;
    } catch { /* overwrite broken file */ }
  }

  const config = { servers: { anforderungsportal: SERVER_CONFIG } };
  mkdirSync(vscodeDir, { recursive: true });
  writeFileSync(mcpPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  return true;
}

// ── CLI: npx anforderungsportal-mcp init [--global|-g] ────────
export async function setup(args: string[]) {
  const isGlobal = args.includes('--global') || args.includes('-g');

  console.log('');
  console.log('  Anforderungsportal MCP — Setup');
  console.log('  ──────────────────────────────');
  console.log('');

  if (isGlobal) {
    const dirs = getEditorSettingsDirs();
    if (dirs.length === 0) {
      console.log('  ⚠  No VS Code / Cursor installation detected.');
      console.log('     Create .vscode/mcp.json manually (see README).');
    }
    for (const { editor, dir } of dirs) {
      const result = addToVSCodeSettings(dir);
      if (result === 'already') {
        console.log(`  ✓  ${editor}: already configured`);
      } else if (result === true) {
        console.log(`  ✓  ${editor}: added to user settings`);
      } else {
        console.log(`  ✗  ${editor}: could not update settings.json`);
      }
    }
  } else {
    const result = createWorkspaceMcp(process.cwd());
    if (result === 'already') {
      console.log('  ✓  .vscode/mcp.json already has anforderungsportal');
    } else {
      console.log('  ✓  Created .vscode/mcp.json');
    }
    console.log('');
    console.log('  Tip: Run with --global to enable in ALL workspaces:');
    console.log('       npx anforderungsportal-mcp init --global');
  }

  console.log('');
  console.log('  Next: Restart VS Code, open chat (Ctrl+L), type:');
  console.log('        login your-email@example.com your-password');
  console.log('');
}

// ── Postinstall (called from scripts/postinstall.mjs) ─────────
export function autoSetup(): void {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════════╗');
  console.log('  ║       Anforderungsportal MCP — Auto-Setup            ║');
  console.log('  ╚══════════════════════════════════════════════════════╝');

  let configured = false;

  // 1. Inject into every detected VS Code / Cursor installation
  const dirs = getEditorSettingsDirs();
  for (const { editor, dir } of dirs) {
    try {
      const result = addToVSCodeSettings(dir);
      if (result === 'already') {
        console.log(`  ✓  ${editor}: already configured`);
        configured = true;
      } else if (result === true) {
        console.log(`  ✓  ${editor}: configured automatically`);
        configured = true;
      }
    } catch { /* never fail install */ }
  }

  // 2. For local installs, also create .vscode/mcp.json in the project
  const initCwd = process.env.INIT_CWD;
  if (initCwd && existsSync(join(initCwd, 'package.json'))) {
    try {
      const result = createWorkspaceMcp(initCwd);
      if (result === true) {
        console.log(`  ✓  Workspace: created .vscode/mcp.json`);
        configured = true;
      }
    } catch { /* never fail install */ }
  }

  console.log('');
  if (configured) {
    console.log('  ✅ Ready!');
  } else {
    console.log('  ⚠  No VS Code detected. Run this in any project folder:');
    console.log('     npx anforderungsportal-mcp init');
  }

  console.log('');
  console.log('  ──────────────────────────────────────────────────────');
  console.log('  HOW TO USE');
  console.log('  ──────────────────────────────────────────────────────');
  console.log('');
  console.log('  1. Restart VS Code');
  console.log('  2. Press Ctrl+L  to open VS Code Chat');
  console.log('  3. Type:  login your-email@example.com yourPassword');
  console.log('  4. Type:  help   to see all commands for your role');
  console.log('');
  console.log('  QUICK COMMANDS');
  console.log('  ──────────────────────────────────────────────────────');
  console.log('  login <email> <password>    → Sign in');
  console.log('  help                        → See your role\'s commands');
  console.log('  whoami                      → Check current session');
  console.log('  list_projects               → Browse your projects');
  console.log('  logout                      → Sign out');
  console.log('');
  console.log('  ──────────────────────────────────────────────────────');
  console.log('  Roles: product_owner | staff | super_admin | client');
  console.log('  Each role shows different commands after login.');
  console.log('  ──────────────────────────────────────────────────────');
  console.log('');
}
