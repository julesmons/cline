import type { ModelProviderConfig } from "@extension/models/provider";

import type { McpServer } from "../../services/mcp/types";


export interface ReclineSettings {

  selectedModelProviderId?: string;
  selectedModelId?: string;

  modelProvider?: ModelProviderReclineSettings;
  mcp?: MCPServerReclineSettings;
}

export type ModelProviderReclineSettings = Record<string, {

  config: ModelProviderConfig & Record<string, unknown>;
  autoApproval: AutoApprovalReclineSettings;
}>;

export interface MCPServerReclineSettings {
  mcpServers: McpServer[];
}

export interface AutoApprovalReclineSettings {

  // Whether auto-approval is enabled
  enabled: boolean;

  // Auto-approval settings per action
  actions: {
    readFiles: boolean; // Read files and directories
    editFiles: boolean; // Edit files
    executeCommands: boolean; // Execute safe commands
    useBrowser: boolean; // Use browser
    useMcp: boolean; // Use MCP servers
  };

  // Maximum number of auto-approved requests
  maxRequests: number;
}
