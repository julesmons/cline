export interface ReclineAskUseMcpServer {
  serverName: string;
  type: "use_mcp_tool" | "access_mcp_resource";
  toolName?: string;
  arguments?: string;
  uri?: string;
}
