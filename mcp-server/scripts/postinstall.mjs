#!/usr/bin/env node
/**
 * postinstall — runs automatically after `npm install [-g] anforderungsportal-mcp`.
 * Injects the MCP server config into every detected VS Code / Cursor installation
 * so users don't have to create mcp.json manually.
 *
 * This is a plain .mjs file (no build step needed).
 * It imports the compiled setup.js from dist/.
 */

import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';

try {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const setupPath = join(__dirname, '..', 'dist', 'setup.js');

  if (existsSync(setupPath)) {
    const { autoSetup } = await import(setupPath);
    autoSetup();
  } else {
    // dist/ not built yet (e.g. during local dev `npm install`)
    console.log('\n  ℹ  Anforderungsportal MCP installed. Run `npm run build` then `npx anforderungsportal-mcp init`.\n');
  }
} catch {
  // Never break npm install — silently fall back to manual setup
  console.log('\n  ℹ  Anforderungsportal MCP installed. Run `npx anforderungsportal-mcp init` to configure.\n');
}
