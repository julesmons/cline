import * as vscode from "vscode";


export const GlobalFileNames = {
  apiConversationHistory: "api_conversation_history.json",
  uiMessages: "ui_messages.json",
  openRouterModels: "openrouter_models.json",
  mcpSettings: "recline_mcp_settings.json",
  reclineRules: ".reclinerules"
};

export const workspaceRoot: string = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath).at(0) ?? ".";
export const extensionPath: string = vscode.extensions.getExtension("julesmons.recline")!.extensionPath;
export const reclineRulesPath: string = `${workspaceRoot}/${GlobalFileNames.reclineRules}`;
