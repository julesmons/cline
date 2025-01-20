import type { ModelProviderConfig } from "@extension/models/provider";

import type { McpServer } from "../../services/mcp/types";


export interface ReclineSettings {

  selectedModelProviderId?: string; // The currently selected model provider.
  selectedModelId?: string; // The currently selected model of the selected model provider.

  modelProvider: ModelProviderReclineSettings; // Model provider settings
  mcp: MCPServerReclineSettings; // MCP server settings
  browser: BrowserReclineSettings; // Browser settings
}

export interface BrowserReclineSettings {
  // Browser viewport settings, required parameters for browser usage.
  viewport: {
    width: number; // Width of the browser viewport
    height: number; // Height of the browser viewport
  };
}

export type ModelProviderReclineSettings = Record<string, {

  config: ModelProviderConfig & Record<string, unknown>; // Provider specific configuration (e.g. API url and/or key)
  autoApproval: AutoApprovalReclineSettings; // Auto-approval settings for this provider
  customInstructions: string; // Provider specific instructions
}>;

export interface MCPServerReclineSettings {
  mcpServers: McpServer[]; // List of registered MCP servers Recline can use
}

export interface AutoApprovalReclineSettings {

  enabled: boolean; // Whether auto-approval is enabled

  // Auto-approval settings per action
  actions: {
    readFiles: boolean; // Read files and directories
    editFiles: boolean; // Edit files
    executeCommands: boolean; // Execute safe commands
    useBrowser: boolean; // Use browser
    useMcp: boolean; // Use MCP servers
  };

  maxRequests: number; // Maximum number of auto-approved requests. If exceeded, user will be prompted for approval to reset the counter. This is to prevent accidental or malicious overuse of auto-approval.
}
