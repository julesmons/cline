import type { McpServer } from "@extension/integrations/mcp/types";

export interface MCPReclineSettings {
  mcpServers: McpServer[]; // List of registered MCP servers Recline can use
}
