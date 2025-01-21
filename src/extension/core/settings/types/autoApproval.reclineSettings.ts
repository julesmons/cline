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
