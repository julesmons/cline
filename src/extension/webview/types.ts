import type { ReclineSettings } from "../core/settings/types";


export interface ReclineWebviewEvent {
  type:
    | "apiConfiguration"
    | "customInstructions"
    | "webviewDidLaunch"
    | "newTask"
    | "askResponse"
    | "clearTask"
    | "didShowAnnouncement"
    | "selectImages"
    | "exportCurrentTask"
    | "showTaskWithId"
    | "deleteTaskWithId"
    | "exportTaskWithId"
    | "resetState"
    | "requestOllamaModels"
    | "requestLmStudioModels"
    | "requestVsCodeLmSelectors"
    | "openImage"
    | "openFile"
    | "openMention"
    | "cancelTask"
    | "refreshOpenRouterModels"
    | "openMcpSettings"
    | "restartMcpServer"
    | "autoApprovalSettings";
  text?: string;
  askResponse?: ReclineAskResponse;
  images?: string[];
  bool?: boolean;
  settings?: ReclineSettings;
}

export type ReclineAskResponse = "yesButtonClicked" | "noButtonClicked" | "messageResponse";
