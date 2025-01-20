import type { McpServer } from "@extension/services/mcp/types";
import type { ReclineSettings } from "@extension/core/settings/types";


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

export interface ReclineState {

  version: string;
  announcement?: string;

  settings?: ReclineSettings;
  customInstructions?: string;

  taskHistory: ReclineTask[];
  reclineMessages: ReclineMessage[];

  uriScheme?: string;
}

export interface ReclineTask {

  id: string;
  ts: number;

  initialPrompt: string;

  tokensIn: number;
  tokensOut: number;
  cacheWrites: number;
  cacheReads: number;

  totalCost: number;

  messages: ReclineMessage[];
}

export interface ReclineMessage {

  id: string; // Unique message ID.
  taskId: string; // ID of the task this message belongs to.
  providerId: string; // ID of the provider that generated this message. Relevant because the user is able to switch between providers during a task.

  ts: number; // Timestamp of the message, which is used to sort messages in the UI.
  partial: boolean; // Whether this message is a partial message or not.

  type: "ask" | "say";
  ask?: ReclineAsk;
  say?: ReclineSay;

  content?: string; // Text content of the message.
  contentTokenCount?: number; // Number of tokens in the content as calculated by the provider.

  images: string[]; // Images in base64 format.

  totalCost: number; // Total cost of the message at the time of creation.
}

export type ReclineAsk =
  | "followup"
  | "command"
  | "command_output"
  | "completion_result"
  | "tool"
  | "api_req_failed"
  | "resume_task"
  | "resume_completed_task"
  | "mistake_limit_reached"
  | "auto_approval_max_req_reached"
  | "browser_action_launch"
  | "use_mcp_server";

export type ReclineSay =
  | "task"
  | "error"
  | "api_req_started"
  | "api_req_finished"
  | "text"
  | "completion_result"
  | "user_feedback"
  | "user_feedback_diff"
  | "api_req_retried"
  | "command"
  | "command_output"
  | "tool"
  | "shell_integration_warning"
  | "browser_action_launch"
  | "browser_action"
  | "browser_action_result"
  | "mcp_server_request_started"
  | "mcp_server_response"
  | "use_mcp_server"
  | "diff_error";

export interface ReclineSayTool {
  tool:
    | "editedExistingFile"
    | "newFileCreated"
    | "readFile"
    | "listFilesTopLevel"
    | "listFilesRecursive"
    | "listCodeDefinitionNames"
    | "searchFiles";
  path?: string;
  diff?: string;
  content?: string;
  regex?: string;
  filePattern?: string;
}

export const browserActions = ["launch", "click", "type", "scroll_down", "scroll_up", "close"] as const;
export type BrowserAction = (typeof browserActions)[number];

export interface ReclineSayBrowserAction {
  action: BrowserAction;
  coordinate?: string;
  text?: string;
}

export interface BrowserActionResult {
  screenshot?: string;
  logs?: string;
  currentUrl?: string;
  currentMousePosition?: string;
}

export interface ReclineAskUseMcpServer {
  serverName: string;
  type: "use_mcp_tool" | "access_mcp_resource";
  toolName?: string;
  arguments?: string;
  uri?: string;
}

export interface ReclineApiReqInfo {
  request?: string;
  tokensIn?: number;
  tokensOut?: number;
  cacheWrites?: number;
  cacheReads?: number;
  cost?: number;
  cancelReason?: ReclineApiReqCancelReason;
  streamingFailedMessage?: string;
}

export type ReclineApiReqCancelReason = "streaming_failed" | "user_cancelled";
