import type { McpServer } from "@extension/integrations/mcp/types";

import type { ReclineState } from "./reclineState";
import type { ReclineMessage } from "./reclineMessage";


export interface ReclineEvent {
  type:
    | "action"
    | "state"
    | "selectedImages"
    | "theme"
    | "workspaceUpdated"
    | "invoke"
    | "partialMessage"
    | "mcpServers";
  text?: string;
  action?:
    | "chatButtonClicked"
    | "mcpButtonClicked"
    | "settingsButtonClicked"
    | "historyButtonClicked"
    | "didBecomeVisible";
  invoke?: "sendMessage" | "primaryButtonClick" | "secondaryButtonClick";
  state?: ReclineState;
  images?: string[];
  filePaths?: string[];
  partialMessage?: ReclineMessage;
  mcpServers?: McpServer[];
}
