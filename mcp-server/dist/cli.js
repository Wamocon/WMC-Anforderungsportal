#!/usr/bin/env node
/**
 * CLI entry point — routes between MCP server mode and setup commands.
 *
 *   npx anforderungsportal-mcp          → MCP server (stdio, used by VS Code / Claude)
 *   npx anforderungsportal-mcp init     → Create .vscode/mcp.json in current directory
 *   npx anforderungsportal-mcp init -g  → Add to VS Code user settings (all workspaces)
 */
const command = process.argv[2];
if (command === 'init') {
    const { setup } = await import('./setup.js');
    await setup(process.argv.slice(3));
}
else {
    await import('./index.js');
}
export {};
