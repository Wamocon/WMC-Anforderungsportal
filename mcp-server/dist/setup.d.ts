/**
 * Setup helpers — create MCP config for VS Code, Cursor, or Claude Desktop.
 * Used by both the `init` CLI command and the postinstall script.
 */
export declare function addToVSCodeSettings(settingsDir: string): boolean | 'already';
export declare function createWorkspaceMcp(projectDir: string): boolean | 'already';
export declare function setup(args: string[]): Promise<void>;
export declare function autoSetup(): void;
