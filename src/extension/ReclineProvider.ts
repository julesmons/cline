import type { Anthropic } from "@anthropic-ai/sdk";
import type { ReclineWebviewEvent } from "src/common/ReclineWebviewEvent";

import type { HistoryItem } from "@shared/HistoryItem";
import type { ReclineEvent, ReclineState } from "@shared/ReclineEvent";
import type { AutoApprovalSettings } from "@shared/AutoApprovalSettings";

import os from "node:os";
import fs from "node:fs/promises";
import * as path from "node:path";

import axios from "axios";
import * as vscode from "vscode";
import pWaitFor from "p-wait-for";

import { findLast } from "@shared/utils/array";
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@shared/AutoApprovalSettings";
import { type ApiProvider, type ModelInfo, type ModelProviderMessage, openAiModelInfoSaneDefaults } from "@shared/api";

import { Recline } from "@extension/Recline";
import { GlobalFileNames } from "@extension/constants";
import { fileExistsAtPath } from "@extension/utils/fs";
import { McpHub } from "@extension/services/mcp/McpHub";
import { modelProviderRegistrar } from "@extension/models";
import { getTheme } from "@extension/integrations/theme/getTheme";
import { selectImages } from "@extension/integrations/misc/process-images";
import { downloadTask } from "@extension/integrations/misc/export-markdown";
import { openFile, openImage } from "@extension/integrations/misc/open-file";
import WorkspaceTracker from "@extension/integrations/workspace/WorkspaceTracker";

import { openMention } from "./core/mentions";
import { getUri } from "./webview/utils/getUri";
import { getNonce } from "./webview/utils/getNonce";


/*
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/blob/main/default/weather-webview/src/providers/WeatherViewProvider.ts

https://github.com/KumarVariable/vscode-extension-sidebar-html/blob/master/src/customSidebarViewProvider.ts
*/

type SecretKey =
  | "apiKey"
  | "openRouterApiKey"
  | "awsAccessKey"
  | "awsSecretKey"
  | "awsSessionToken"
  | "openAiApiKey"
  | "geminiApiKey"
  | "openAiNativeApiKey"
  | "deepSeekApiKey";
type GlobalStateKey =
  | "apiProvider"
  | "apiModelId"
  | "awsRegion"
  | "awsUseCrossRegionInference"
  | "vertexProjectId"
  | "vertexRegion"
  | "lastShownAnnouncementId"
  | "customInstructions"
  | "taskHistory"
  | "openAiBaseUrl"
  | "openAiModelId"
  | "ollamaModelId"
  | "ollamaBaseUrl"
  | "lmStudioModelId"
  | "lmStudioBaseUrl"
  | "anthropicBaseUrl"
  | "azureApiVersion"
  | "openRouterModelId"
  | "openRouterModelInfo"
  | "autoApprovalSettings"
  | "vsCodeLmModelSelector";

export class ReclineProvider implements vscode.WebviewViewProvider {
  private static activeInstances: Set<ReclineProvider> = new Set();
  public static readonly sideBarId = "recline.SidebarProvider"; // used in package.json as the view's id. This value cannot be changed due to how vscode caches views based on their id, and updating the id would break existing instances of the extension.
  public static readonly tabPanelId = "recline.TabPanelProvider";
  private disposables: vscode.Disposable[] = [];
  private latestAnnouncementId = "jan-01-2025"; // update to some unique identifier when we add a new announcement
  private recline?: Recline;
  private view?: vscode.WebviewView | vscode.WebviewPanel;
  private workspaceTracker?: WorkspaceTracker;
  mcpHub?: McpHub;

  constructor(
    readonly context: vscode.ExtensionContext,
    private readonly outputChannel: vscode.OutputChannel
  ) {
    this.outputChannel.appendLine("ReclineProvider instantiated");
    ReclineProvider.activeInstances.add(this);
    this.workspaceTracker = new WorkspaceTracker(this);
    this.mcpHub = new McpHub(this);
  }

  public static getVisibleInstance(): ReclineProvider | undefined {
    return findLast(Array.from(this.activeInstances), instance => instance.view?.visible === true);
  }

  private async ensureCacheDirectoryExists(): Promise<string> {
    const cacheDir = path.join(this.context.globalStorageUri.fsPath, "cache");
    await fs.mkdir(cacheDir, { recursive: true });
    return cacheDir;
  }

  /**
   * Defines and returns the HTML that should be rendered within the webview panel.
   *
   * @remarks This is also the place where references to the React webview build files
   * are created and inserted into the webview HTML.
   *
   * @param webview A reference to the extension webview
   * @param extensionUri The URI of the directory containing the extension
   * @returns A template string literal containing the HTML that should be
   * rendered within the webview panel
   */
  private getHtmlContent(webview: vscode.Webview): string {

    const stylesUri: vscode.Uri = getUri(webview, this.context.extensionUri, ["dist", "webview.css"]);
    const scriptUri: vscode.Uri = getUri(webview, this.context.extensionUri, ["dist", "webview.js"]);

    const nonce = getNonce();

    return /* html */ `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
            <meta name="theme-color" content="#000000">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';">
            <link rel="stylesheet" type="text/css" href="${stylesUri.toString()}">
            <title>Recline</title>
          </head>
          <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root"></div>
            <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
          </body>
        </html>
      `;
  }

  private async getSecret(key: SecretKey): Promise<string | undefined> {
    return this.context.secrets.get(key);
  }

  private async getWorkspaceState(key: string): Promise<unknown> {
    return await this.context.workspaceState.get(key);
  }

  /**
   * Sets up an event listener to listen for messages passed from the webview context and
   * executes code based on the message that is recieved.
   *
   * @param webview A reference to the extension webview
   */
  private setReclineWebviewEventListener(webview: vscode.Webview): void {
    webview.onDidReceiveMessage(
      async (message: ReclineWebviewEvent) => {
        switch (message.type) {
          case "webviewDidLaunch":
            void this.postStateToWebview();
            await this.workspaceTracker?.initializeFilePaths();
            void getTheme().then(async theme =>
              this.postMessageToWebview({ type: "theme", text: JSON.stringify(theme) })
            );
            // post last cached models in case the call to endpoint fails
            void this.readOpenRouterModels().then((openRouterModels) => {
              if (openRouterModels) {
                void this.postMessageToWebview({ type: "openRouterModels", openRouterModels });
              }
            });
            // gui relies on model info to be up-to-date to provide the most accurate pricing, so we need to fetch the latest details on launch.
            // we do this for all users since many users switch between api providers and if they were to switch back to openrouter it would be showing outdated model info if we hadn't retrieved the latest at this point
            // (see normalizeApiConfiguration > openrouter)
            void this.refreshOpenRouterModels().then(async (openRouterModels) => {
              if (openRouterModels != null) {
                // update model info in state (this needs to be done here since we don't want to update state while settings is open, and we may refresh models there)
                const { apiConfiguration } = await this.getState();
                if (apiConfiguration != null && apiConfiguration.openRouterModelId != null && apiConfiguration.openRouterModelId.length > 0 && openRouterModels[apiConfiguration.openRouterModelId] != null) {
                  await this.updateGlobalState(
                    "openRouterModelInfo",
                    openRouterModels[apiConfiguration.openRouterModelId]
                  );
                  await this.postStateToWebview();
                }
              }
            });
            break;
          case "newTask":
            // Code that should run in response to the hello message command
            // vscode.window.showInformationMessage(message.text!)

            // Send a message to our webview.
            // You can send any JSON serializable data.
            // Could also do this in extension .ts
            // this.postMessageToWebview({ type: "text", text: `Extension: ${Date.now()}` })
            // initializing new instance of Recline will make sure that any agentically running promises in old instance don't affect our new task. this essentially creates a fresh slate for the new task
            await this.initReclineWithTask(message.text, message.images);
            break;
          case "apiConfiguration":
            if (message.apiConfiguration) {
              const {
                apiProvider,
                apiModelId,
                apiKey,
                openRouterApiKey,
                awsAccessKey,
                awsSecretKey,
                awsSessionToken,
                awsRegion,
                awsUseCrossRegionInference,
                vertexProjectId,
                vertexRegion,
                openAiBaseUrl,
                openAiApiKey,
                openAiModelId,
                ollamaModelId,
                ollamaBaseUrl,
                lmStudioModelId,
                lmStudioBaseUrl,
                anthropicBaseUrl,
                geminiApiKey,
                openAiNativeApiKey,
                deepSeekApiKey,
                azureApiVersion,
                openRouterModelId,
                openRouterModelInfo,
                vsCodeLmModelSelector
              } = message.apiConfiguration;
              await this.updateGlobalState("apiProvider", apiProvider);
              await this.updateGlobalState("apiModelId", apiModelId);
              await this.storeSecret("apiKey", apiKey);
              await this.storeSecret("openRouterApiKey", openRouterApiKey);
              await this.storeSecret("awsAccessKey", awsAccessKey);
              await this.storeSecret("awsSecretKey", awsSecretKey);
              await this.storeSecret("awsSessionToken", awsSessionToken);
              await this.updateGlobalState("awsRegion", awsRegion);
              await this.updateGlobalState("awsUseCrossRegionInference", awsUseCrossRegionInference);
              await this.updateGlobalState("vertexProjectId", vertexProjectId);
              await this.updateGlobalState("vertexRegion", vertexRegion);
              await this.updateGlobalState("openAiBaseUrl", openAiBaseUrl);
              await this.storeSecret("openAiApiKey", openAiApiKey);
              await this.updateGlobalState("openAiModelId", openAiModelId);
              await this.updateGlobalState("ollamaModelId", ollamaModelId);
              await this.updateGlobalState("ollamaBaseUrl", ollamaBaseUrl);
              await this.updateGlobalState("lmStudioModelId", lmStudioModelId);
              await this.updateGlobalState("lmStudioBaseUrl", lmStudioBaseUrl);
              await this.updateGlobalState("anthropicBaseUrl", anthropicBaseUrl);
              await this.storeSecret("geminiApiKey", geminiApiKey);
              await this.storeSecret("openAiNativeApiKey", openAiNativeApiKey);
              await this.storeSecret("deepSeekApiKey", deepSeekApiKey);
              await this.updateGlobalState("azureApiVersion", azureApiVersion);
              await this.updateGlobalState("openRouterModelId", openRouterModelId);
              await this.updateGlobalState("openRouterModelInfo", openRouterModelInfo);
              await this.updateGlobalState("vsCodeLmModelSelector", vsCodeLmModelSelector);
              if (this.recline) {
                const { apiProvider, ...apiProviderConfig } = message.apiConfiguration;
                this.recline.selectedProvider = modelProviderRegistrar.buildProvider(apiProvider, apiProviderConfig);
              }
            }
            await this.postStateToWebview();
            break;
          case "customInstructions":
            await this.updateCustomInstructions(message.text);
            break;
          case "autoApprovalSettings":
            if (message.autoApprovalSettings) {
              await this.updateGlobalState("autoApprovalSettings", message.autoApprovalSettings);
              if (this.recline) {
                this.recline.autoApprovalSettings = message.autoApprovalSettings;
              }
              await this.postStateToWebview();
            }
            break;
          case "askResponse":
            void this.recline?.handleWebviewAskResponse(message.askResponse, message.text, message.images);
            break;
          case "clearTask":
            // newTask will start a new task with a given task text, while clear task resets the current session and allows for a new task to be started
            await this.clearTask();
            await this.postStateToWebview();
            break;
          case "didShowAnnouncement":
            await this.updateGlobalState("lastShownAnnouncementId", this.latestAnnouncementId);
            await this.postStateToWebview();
            break;
          case "selectImages": {
            const images = await selectImages();
            await this.postMessageToWebview({ type: "selectedImages", images });
            break;
          }
          case "exportCurrentTask": {
            const currentTaskId = this.recline?.taskId;
            if (currentTaskId != null && currentTaskId.length > 0) {
              void this.exportTaskWithId(currentTaskId);
            }
            break;
          }
          case "showTaskWithId":
            void this.showTaskWithId(message.text);
            break;
          case "deleteTaskWithId":
            void this.deleteTaskWithId(message.text);
            break;
          case "exportTaskWithId":
            void this.exportTaskWithId(message.text);
            break;
          case "resetState":
            await this.resetState();
            break;
          case "requestOllamaModels": {
            const ollamaModels = await this.getOllamaModels(message.text);
            void this.postMessageToWebview({ type: "ollamaModels", ollamaModels });
            break;
          }
          case "requestLmStudioModels": {
            const lmStudioModels = await this.getLmStudioModels(message.text);
            void this.postMessageToWebview({ type: "lmStudioModels", lmStudioModels });
            break;
          }
          case "requestVsCodeLmSelectors": {
            const vsCodeLmSelectors = await this.getVsCodeLmSelectors();
            void this.postMessageToWebview({ type: "vsCodeLmSelectors", vsCodeLmSelectors });
            break;
          }
          case "refreshOpenRouterModels": {
            await this.refreshOpenRouterModels();
            break;
          }
          case "openImage": {
            void openImage(message.text);
            break;
          }
          case "openFile":
            void openFile(message.text);
            break;
          case "openMention":
            openMention(message.text);
            break;
          case "cancelTask":
            if (this.recline) {
              const { historyItem } = await this.getTaskWithId(this.recline.taskId);
              await this.recline.abortTask();
              await pWaitFor(() => this.recline == null || this.recline.didFinishAborting, {
                timeout: 3_000
              }).catch(() => {
                console.error("Failed to abort task");
              });
              if (this.recline != null) {
                // 'abandoned' will prevent this recline instance from affecting future recline instance gui. this may happen if its hanging on a streaming request
                this.recline.abandoned = true;
              }
              await this.initReclineWithHistoryItem(historyItem); // clears task again, so we need to abortTask manually above
              // await this.postStateToWebview() // new Recline instance will post state when it's ready. having this here sent an empty messages array to webview leading to virtuoso having to reload the entire list
            }

            break;
          case "openMcpSettings": {
            const mcpSettingsFilePath = await this.mcpHub?.getMcpSettingsFilePath();
            if (mcpSettingsFilePath != null && mcpSettingsFilePath.length > 0) {
              void openFile(mcpSettingsFilePath);
            }
            break;
          }
          case "restartMcpServer": {
            try {
              await this.mcpHub?.restartConnection(message.text);
            }
            catch (error) {
              console.error(`Failed to retry connection for ${message.text}:`, error);
            }
            break;
          }
          // Add more switch case statements here as more webview message commands
          // are created within the webview context (i.e. inside media/main.js)
        }
      },
      null,
      this.disposables
    );
  }

  private async storeSecret(key: SecretKey, value?: string): Promise<void> {
    if (value != null && value.length > 0) {
      await this.context.secrets.store(key, value);
    }
    else {
      await this.context.secrets.delete(key);
    }
  }

  private async updateWorkspaceState(key: string, value: any): Promise<void> {
    await this.context.workspaceState.update(key, value);
  }

  async clearTask(): Promise<void> {
    void this.recline?.abortTask();
    this.recline = undefined; // removes reference to it, so once promises end it will be garbage collected
  }

  async deleteTaskFromState(id: string): Promise<void> {
    // Remove the task from history
    const taskHistory = ((await this.getGlobalState("taskHistory")) as HistoryItem[] | undefined) || [];
    const updatedTaskHistory = taskHistory.filter(task => task.id !== id);
    await this.updateGlobalState("taskHistory", updatedTaskHistory);

    // Notify the webview that the task has been deleted
    await this.postStateToWebview();
  }

  async deleteTaskWithId(id: string): Promise<void> {
    if (id === this.recline?.taskId) {
      await this.clearTask();
    }

    const { taskDirPath, apiConversationHistoryFilePath, uiMessagesFilePath } = await this.getTaskWithId(id);

    await this.deleteTaskFromState(id);

    // Delete the task files
    const apiConversationHistoryFileExists = await fileExistsAtPath(apiConversationHistoryFilePath);
    if (apiConversationHistoryFileExists) {
      await fs.unlink(apiConversationHistoryFilePath);
    }
    const uiMessagesFileExists = await fileExistsAtPath(uiMessagesFilePath);
    if (uiMessagesFileExists) {
      await fs.unlink(uiMessagesFilePath);
    }
    const legacyMessagesFilePath = path.join(taskDirPath, "claude_messages.json");
    if (await fileExistsAtPath(legacyMessagesFilePath)) {
      await fs.unlink(legacyMessagesFilePath);
    }
    await fs.rmdir(taskDirPath); // succeeds if the dir is empty
  }

  /*
VSCode extensions use the disposable pattern to clean up resources when the sidebar/editor tab is closed by the user or system. This applies to event listening, commands, interacting with the UI, etc.
- https://vscode-docs.readthedocs.io/en/stable/extensions/patterns-and-principles/
- https://github.com/microsoft/vscode-extension-samples/blob/main/webview-sample/src/extension.ts
*/
  async dispose(): Promise<void> {
    this.outputChannel.appendLine("Disposing ReclineProvider...");
    await this.clearTask();
    this.outputChannel.appendLine("Cleared task");
    if (this.view && "dispose" in this.view) {
      this.view.dispose();
      this.outputChannel.appendLine("Disposed webview");
    }
    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) {
        x.dispose();
      }
    }
    this.workspaceTracker?.dispose();
    this.workspaceTracker = undefined;
    void this.mcpHub?.dispose();
    this.mcpHub = undefined;
    this.outputChannel.appendLine("Disposed all disposables");
    ReclineProvider.activeInstances.delete(this);
  }

  async ensureMcpServersDirectoryExists(): Promise<string> {
    const mcpServersDir = path.join(os.homedir(), "Documents", "Recline", "MCP");
    try {
      await fs.mkdir(mcpServersDir, { recursive: true });
    }
    catch {
      return "~/Documents/Recline/MCP"; // in case creating a directory in documents fails for whatever reason (e.g. permissions) - this is fine since this path is only ever used in the system prompt
    }
    return mcpServersDir;
  }

  async ensureSettingsDirectoryExists(): Promise<string> {
    const settingsDir = path.join(this.context.globalStorageUri.fsPath, "settings");
    await fs.mkdir(settingsDir, { recursive: true });
    return settingsDir;
  }

  async exportTaskWithId(id: string): Promise<void> {
    const { historyItem, apiConversationHistory } = await this.getTaskWithId(id);
    await downloadTask(historyItem.ts, apiConversationHistory);
  }

  async getGlobalState(key: GlobalStateKey): Promise<unknown> {
    return await this.context.globalState.get(key);
  }

  async getLmStudioModels(baseUrl?: string): Promise<string[]> {
    try {
      if (baseUrl == null || baseUrl.length === 0) {
        baseUrl = "http://localhost:1234";
      }
      if (!URL.canParse(baseUrl)) {
        return [];
      }
      const response = await axios.get(`${baseUrl}/v1/models`);
      // eslint-disable-next-line ts/no-unsafe-assignment, ts/strict-boolean-expressions, ts/no-unsafe-call, ts/no-unsafe-member-access, ts/no-unsafe-return
      const modelsArray = response.data?.data?.map((model: any) => model.id) || [];
      // eslint-disable-next-line ts/no-unsafe-argument
      const models = [...new Set<string>(modelsArray)];
      return models;
    }
    catch {
      return [];
    }
  }

  async getOllamaModels(baseUrl?: string): Promise<string[]> {
    try {
      if (baseUrl == null || baseUrl.length === 0) {
        baseUrl = "http://localhost:11434";
      }
      if (!URL.canParse(baseUrl)) {
        return [];
      }
      const response = await axios.get(`${baseUrl}/api/tags`);
      // eslint-disable-next-line ts/no-unsafe-assignment, ts/strict-boolean-expressions, ts/no-unsafe-call, ts/no-unsafe-member-access, ts/no-unsafe-return
      const modelsArray = response.data?.models?.map((model: any) => model.name) || [];
      // eslint-disable-next-line ts/no-unsafe-argument
      const models = [...new Set<string>(modelsArray)];
      return models;
    }
    catch {
      return [];
    }
  }

  async getState(): Promise<Partial<ReclineState> & { [key: string]: any }> {
    const [
      storedApiProvider,
      apiModelId,
      apiKey,
      openRouterApiKey,
      awsAccessKey,
      awsSecretKey,
      awsSessionToken,
      awsRegion,
      awsUseCrossRegionInference,
      vertexProjectId,
      vertexRegion,
      openAiBaseUrl,
      openAiApiKey,
      openAiModelId,
      ollamaModelId,
      ollamaBaseUrl,
      lmStudioModelId,
      lmStudioBaseUrl,
      anthropicBaseUrl,
      geminiApiKey,
      openAiNativeApiKey,
      deepSeekApiKey,
      azureApiVersion,
      openRouterModelId,
      openRouterModelInfo,
      lastShownAnnouncementId,
      customInstructions,
      taskHistory,
      autoApprovalSettings,
      vsCodeLmModelSelector
    ] = await Promise.all([
      this.getGlobalState("apiProvider") as Promise<ApiProvider | undefined>,
      this.getGlobalState("apiModelId") as Promise<string | undefined>,
      this.getSecret("apiKey"),
      this.getSecret("openRouterApiKey"),
      this.getSecret("awsAccessKey"),
      this.getSecret("awsSecretKey"),
      this.getSecret("awsSessionToken"),
      this.getGlobalState("awsRegion") as Promise<string | undefined>,
      this.getGlobalState("awsUseCrossRegionInference") as Promise<boolean | undefined>,
      this.getGlobalState("vertexProjectId") as Promise<string | undefined>,
      this.getGlobalState("vertexRegion") as Promise<string | undefined>,
      this.getGlobalState("openAiBaseUrl") as Promise<string | undefined>,
      this.getSecret("openAiApiKey"),
      this.getGlobalState("openAiModelId") as Promise<string | undefined>,
      this.getGlobalState("ollamaModelId") as Promise<string | undefined>,
      this.getGlobalState("ollamaBaseUrl") as Promise<string | undefined>,
      this.getGlobalState("lmStudioModelId") as Promise<string | undefined>,
      this.getGlobalState("lmStudioBaseUrl") as Promise<string | undefined>,
      this.getGlobalState("anthropicBaseUrl") as Promise<string | undefined>,
      this.getSecret("geminiApiKey"),
      this.getSecret("openAiNativeApiKey"),
      this.getSecret("deepSeekApiKey"),
      this.getGlobalState("azureApiVersion") as Promise<string | undefined>,
      this.getGlobalState("openRouterModelId") as Promise<string | undefined>,
      this.getGlobalState("openRouterModelInfo") as Promise<ModelInfo | undefined>,
      this.getGlobalState("lastShownAnnouncementId") as Promise<string | undefined>,
      this.getGlobalState("customInstructions") as Promise<string | undefined>,
      this.getGlobalState("taskHistory") as Promise<HistoryItem[] | undefined>,
      this.getGlobalState("autoApprovalSettings") as Promise<AutoApprovalSettings | undefined>,
      this.getGlobalState("vsCodeLmModelSelector") as Promise<vscode.LanguageModelChatSelector | undefined>
    ]);

    let apiProvider: ApiProvider = "openrouter"; // Default to openrouter
    if (storedApiProvider) {
      apiProvider = storedApiProvider;
    }
    else if (apiKey != null && apiKey.length > 0) {
      apiProvider = "anthropic";
    }

    return {
      apiConfiguration: {
        apiProvider,
        apiModelId,
        apiKey,
        openRouterApiKey,
        awsAccessKey,
        awsSecretKey,
        awsSessionToken,
        awsRegion,
        awsUseCrossRegionInference,
        vertexProjectId,
        vertexRegion,
        openAiBaseUrl,
        openAiApiKey,
        openAiModelId,
        ollamaModelId,
        ollamaBaseUrl,
        lmStudioModelId,
        lmStudioBaseUrl,
        anthropicBaseUrl,
        geminiApiKey,
        openAiNativeApiKey,
        deepSeekApiKey,
        azureApiVersion,
        openRouterModelId,
        openRouterModelInfo,
        vsCodeLmModelSelector
      },
      lastShownAnnouncementId,
      customInstructions,
      taskHistory: taskHistory || [],
      autoApprovalSettings: autoApprovalSettings || DEFAULT_AUTO_APPROVAL_SETTINGS
    };
  }

  async getStateToPostToWebview(): Promise<ReclineState> {
    const { apiConfiguration, lastShownAnnouncementId, customInstructions, taskHistory, autoApprovalSettings } = await this.getState();
    return {
      version: (this.context.extension?.packageJSON as { version: string })?.version ?? "",
      apiConfiguration,
      customInstructions,
      uriScheme: vscode.env.uriScheme,
      reclineMessages: this.recline?.reclineMessages || [],
      taskHistory: (taskHistory || []).filter(item => item.ts != null && item.task != null).sort((a, b) => b.ts - a.ts),
      shouldShowAnnouncement: lastShownAnnouncementId !== this.latestAnnouncementId,
      autoApprovalSettings: autoApprovalSettings || DEFAULT_AUTO_APPROVAL_SETTINGS
    };
  }

  async getTaskWithId(id: string): Promise<{
    historyItem: HistoryItem;
    taskDirPath: string;
    apiConversationHistoryFilePath: string;
    uiMessagesFilePath: string;
    apiConversationHistory: Anthropic.MessageParam[];
  }> {
    const history = ((await this.getGlobalState("taskHistory")) as HistoryItem[] | undefined) || [];
    const historyItem = history.find(item => item.id === id);
    if (historyItem) {
      const taskDirPath = path.join(this.context.globalStorageUri.fsPath, "tasks", id);
      const apiConversationHistoryFilePath = path.join(taskDirPath, GlobalFileNames.apiConversationHistory);
      const uiMessagesFilePath = path.join(taskDirPath, GlobalFileNames.uiMessages);
      const fileExists = await fileExistsAtPath(apiConversationHistoryFilePath);
      if (fileExists) {
        const apiConversationHistory = JSON.parse(await fs.readFile(apiConversationHistoryFilePath, "utf8")) as ModelProviderMessage[];
        return {
          historyItem,
          taskDirPath,
          apiConversationHistoryFilePath,
          uiMessagesFilePath,
          apiConversationHistory
        };
      }
    }
    // if we tried to get a task that doesn't exist, remove it from state
    // FIXME: this seems to happen sometimes when the json file doesnt save to disk for some reason
    await this.deleteTaskFromState(id);
    throw new Error("Task not found");
  }

  async getVsCodeLmSelectors(): Promise<vscode.LanguageModelChat[]> {
    return vscode.lm.selectChatModels();
  }

  async handleOpenRouterCallback(code: string): Promise<void> {
    let apiKey: string;
    try {
      const response = await axios.post("https://openrouter.ai/api/v1/auth/keys", { code });
      // eslint-disable-next-line ts/no-unsafe-member-access
      if (response.data != null && response.data.key != null) {
        // eslint-disable-next-line ts/no-unsafe-assignment, ts/no-unsafe-member-access
        apiKey = response.data.key;
      }
      else {
        throw new Error("Invalid response from OpenRouter API");
      }
    }
    catch (error) {
      console.error("Error exchanging code for API key:", error);
      throw error;
    }

    const openrouter: ApiProvider = "openrouter";
    await this.updateGlobalState("apiProvider", openrouter);
    await this.storeSecret("openRouterApiKey", apiKey);
    await this.postStateToWebview();
    if (this.recline) {
      this.recline.selectedProvider = modelProviderRegistrar.buildProvider(openrouter, { openRouterApiKey: apiKey });
    }
    // await this.postMessageToWebview({ type: "action", action: "settingsButtonClicked" }) // bad ux if user is on welcome
  }

  async initReclineWithHistoryItem(historyItem: HistoryItem): Promise<void> {
    await this.clearTask();
    const { apiConfiguration, customInstructions, autoApprovalSettings } = await this.getState();

    if (apiConfiguration == null) {
      throw new Error("API configuration is missing");
    }

    if (autoApprovalSettings == null) {
      throw new Error("Auto approval settings are missing");
    }

    this.recline = new Recline(
      this,
      apiConfiguration,
      autoApprovalSettings,
      customInstructions,
      undefined,
      undefined,
      historyItem
    );
  }

  async initReclineWithTask(task?: string, images?: string[]): Promise<void> {
    await this.clearTask(); // ensures that an exising task doesn't exist before starting a new one, although this shouldn't be possible since user must clear task before starting a new one
    const { apiConfiguration, customInstructions, autoApprovalSettings } = await this.getState();

    if (apiConfiguration == null) {
      throw new Error("API configuration is missing");
    }

    if (autoApprovalSettings == null) {
      throw new Error("Auto approval settings are missing");
    }

    this.recline = new Recline(this, apiConfiguration, autoApprovalSettings, customInstructions, task, images);
  }

  // Send any JSON serializable data to the react app
  async postMessageToWebview(message: ReclineEvent): Promise<void> {
    await this.view?.webview.postMessage(message);
  }

  // Caching mechanism to keep track of webview messages + API conversation history per provider instance

  /*
Now that we use retainContextWhenHidden, we don't have to store a cache of recline messages in the user's state, but we could to reduce memory footprint in long conversations.

- We have to be careful of what state is shared between ReclineProvider instances since there could be multiple instances of the extension running at once. For example when we cached recline messages using the same key, two instances of the extension could end up using the same key and overwriting each other's messages.
- Some state does need to be shared between the instances, i.e. the API key--however there doesn't seem to be a good way to notfy the other instances that the API key has changed.

We need to use a unique identifier for each ReclineProvider instance's message cache since we could be running several instances of the extension outside of just the sidebar i.e. in editor panels.

// conversation history to send in API requests

/*
It seems that some API messages do not comply with vscode state requirements. Either the Anthropic library is manipulating these values somehow in the backend in a way thats creating cyclic references, or the API returns a function or a Symbol as part of the message content.
VSCode docs about state: "The value must be JSON-stringifyable ... value — A value. MUST not contain cyclic references."
For now we'll store the conversation history in memory, and if we need to store in state directly we'd need to do a manual conversion to ensure proper json stringification.
*/

  // getApiConversationHistory(): Anthropic.MessageParam[] {
  // // const history = (await this.getGlobalState(
  // // this.getApiConversationHistoryStateKey()
  // // )) as Anthropic.MessageParam[]
  // // return history || []
  // return this.apiConversationHistory
  // }

  // setApiConversationHistory(history: Anthropic.MessageParam[] | undefined) {
  // // await this.updateGlobalState(this.getApiConversationHistoryStateKey(), history)
  // this.apiConversationHistory = history || []
  // }

  // addMessageToApiConversationHistory(message: Anthropic.MessageParam): Anthropic.MessageParam[] {
  // // const history = await this.getApiConversationHistory()
  // // history.push(message)
  // // await this.setApiConversationHistory(history)
  // // return history
  // this.apiConversationHistory.push(message)
  // return this.apiConversationHistory
  // }

  /*
Storage
https://dev.to/kompotkot/how-to-use-secretstorage-in-your-vscode-extensions-2hco
https://www.eliostruyf.com/devhack-code-extension-storage-options/
*/

  async postStateToWebview(): Promise<void> {
    const state = await this.getStateToPostToWebview();
    void this.postMessageToWebview({ type: "state", state });
  }

  async readOpenRouterModels(): Promise<Record<string, ModelInfo> | undefined> {
    const openRouterModelsFilePath = path.join(
      await this.ensureCacheDirectoryExists(),
      GlobalFileNames.openRouterModels
    );
    const fileExists = await fileExistsAtPath(openRouterModelsFilePath);
    if (fileExists) {
      const fileContents = await fs.readFile(openRouterModelsFilePath, "utf8");
      return JSON.parse(fileContents) as Record<string, ModelInfo>;
    }
    return undefined;
  }

  async refreshOpenRouterModels(): Promise<Record<string, ModelInfo>> {
    const openRouterModelsFilePath = path.join(
      await this.ensureCacheDirectoryExists(),
      GlobalFileNames.openRouterModels
    );

    const models: Record<string, ModelInfo> = {};
    try {
      const response = await axios.get("https://openrouter.ai/api/v1/models");
      /*
{
"id": "anthropic/claude-3.5-sonnet",
"name": "Anthropic: Claude 3.5 Sonnet",
"created": 1718841600,
"description": "Claude 3.5 Sonnet delivers better-than-Opus capabilities, faster-than-Sonnet speeds, at the same Sonnet prices. Sonnet is particularly good at:\n\n- Coding: Autonomously writes, edits, and runs code with reasoning and troubleshooting\n- Data science: Augments human data science expertise; navigates unstructured data while using multiple tools for insights\n- Visual processing: excelling at interpreting charts, graphs, and images, accurately transcribing text to derive insights beyond just the text alone\n- Agentic tasks: exceptional tool use, making it great at agentic tasks (i.e. complex, multi-step problem solving tasks that require engaging with other systems)\n\n#multimodal",
"context_length": 200000,
"architecture": {
"modality": "text+image-\u003Etext",
"tokenizer": "Claude",
"instruct_type": null
},
"pricing": {
"prompt": "0.000003",
"completion": "0.000015",
"image": "0.0048",
"request": "0"
},
"top_provider": {
"context_length": 200000,
"max_completion_tokens": 8192,
"is_moderated": true
},
"per_request_limits": null
},
*/
      // eslint-disable-next-line ts/no-unsafe-member-access
      if (response.data?.data != null) {
        // eslint-disable-next-line ts/no-unsafe-assignment, ts/no-unsafe-member-access
        const rawModels = response.data.data;
        const parsePrice = (price: any): number | undefined => {
          if (price != null && typeof price === "string") {
            return Number.parseFloat(price) * 1_000_000;
          }
          else if (price != null && typeof price === "number") {
            return price * 1_000_000;
          }
          return undefined;
        };
        for (const rawModel of rawModels) {
          const modelInfo: ModelInfo = {
            // eslint-disable-next-line ts/no-unsafe-assignment, ts/no-unsafe-member-access
            maxTokens: rawModel?.top_provider?.max_completion_tokens ?? openAiModelInfoSaneDefaults.maxTokens,
            // eslint-disable-next-line ts/no-unsafe-assignment, ts/no-unsafe-member-access
            contextWindow: rawModel?.context_length ?? openAiModelInfoSaneDefaults.contextWindow,
            // eslint-disable-next-line ts/no-unsafe-assignment, ts/no-unsafe-call, ts/no-unsafe-member-access
            supportsImages: rawModel?.architecture?.modality?.includes("image") ?? false,
            supportsPromptCache: false,
            // eslint-disable-next-line ts/no-unsafe-member-access
            inputPrice: parsePrice(rawModel?.pricing?.prompt) ?? 0,
            // eslint-disable-next-line ts/no-unsafe-member-access
            outputPrice: parsePrice(rawModel?.pricing?.completion) ?? 0,
            // eslint-disable-next-line ts/no-unsafe-assignment, ts/no-unsafe-member-access
            description: rawModel?.description ?? ""
          };

          // eslint-disable-next-line ts/no-unsafe-member-access
          if (rawModel?.id != null && typeof rawModel.id === "string") {

            // eslint-disable-next-line ts/no-unsafe-member-access
            switch (rawModel.id) {
              case "anthropic/claude-3.5-sonnet":
              case "anthropic/claude-3.5-sonnet:beta":
                // NOTE: this needs to be synced with api.ts/openrouter default model info
                modelInfo.supportsComputerUse = true;
                modelInfo.supportsPromptCache = true;
                modelInfo.cacheWritesPrice = 3.75;
                modelInfo.cacheReadsPrice = 0.3;
                break;
              case "anthropic/claude-3.5-sonnet-20240620":
              case "anthropic/claude-3.5-sonnet-20240620:beta":
                modelInfo.supportsPromptCache = true;
                modelInfo.cacheWritesPrice = 3.75;
                modelInfo.cacheReadsPrice = 0.3;
                break;
              case "anthropic/claude-3-5-haiku":
              case "anthropic/claude-3-5-haiku:beta":
              case "anthropic/claude-3-5-haiku-20241022":
              case "anthropic/claude-3-5-haiku-20241022:beta":
              case "anthropic/claude-3.5-haiku":
              case "anthropic/claude-3.5-haiku:beta":
              case "anthropic/claude-3.5-haiku-20241022":
              case "anthropic/claude-3.5-haiku-20241022:beta":
                modelInfo.supportsPromptCache = true;
                modelInfo.cacheWritesPrice = 1.25;
                modelInfo.cacheReadsPrice = 0.1;
                break;
              case "anthropic/claude-3-opus":
              case "anthropic/claude-3-opus:beta":
                modelInfo.supportsPromptCache = true;
                modelInfo.cacheWritesPrice = 18.75;
                modelInfo.cacheReadsPrice = 1.5;
                break;
              case "anthropic/claude-3-haiku":
              case "anthropic/claude-3-haiku:beta":
                modelInfo.supportsPromptCache = true;
                modelInfo.cacheWritesPrice = 0.3;
                modelInfo.cacheReadsPrice = 0.03;
                break;
              case "deepseek/deepseek-chat":
                modelInfo.supportsPromptCache = true;
                // see api.ts/deepSeekModels for more info
                modelInfo.inputPrice = 0;
                modelInfo.cacheWritesPrice = 0.14;
                modelInfo.cacheReadsPrice = 0.014;
                break;
            }

            // eslint-disable-next-line ts/no-unsafe-member-access
            models[rawModel.id] = modelInfo;
          }
        }
      }
      else {
        console.error("Invalid response from OpenRouter API");
      }
      await fs.writeFile(openRouterModelsFilePath, JSON.stringify(models));
      console.log("OpenRouter models fetched and saved", models);
    }
    catch (error) {
      console.error("Error fetching OpenRouter models:", error);
    }

    await this.postMessageToWebview({ type: "openRouterModels", openRouterModels: models });
    return models;
  }

  async resetState(): Promise<void> {
    vscode.window.showInformationMessage("Resetting state...");
    for (const key of this.context.globalState.keys()) {
      await this.context.globalState.update(key, undefined);
    }
    const secretKeys: SecretKey[] = [
      "apiKey",
      "openRouterApiKey",
      "awsAccessKey",
      "awsSecretKey",
      "awsSessionToken",
      "openAiApiKey",
      "geminiApiKey",
      "openAiNativeApiKey",
      "deepSeekApiKey"
    ];
    for (const key of secretKeys) {
      await this.storeSecret(key, undefined);
    }
    if (this.recline) {
      void this.recline.abortTask();
      this.recline = undefined;
    }
    vscode.window.showInformationMessage("State reset");
    await this.postStateToWebview();
    await this.postMessageToWebview({ type: "action", action: "chatButtonClicked" });
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView | vscode.WebviewPanel
    // context: vscode.WebviewViewResolveContext<unknown>, used to recreate a deallocated webview, but we don't need this since we use retainContextWhenHidden
    // token: vscode.CancellationToken
  ): void | Thenable<void> {
    this.outputChannel.appendLine("Resolving webview view");
    this.view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };
    webviewView.webview.html = this.getHtmlContent(webviewView.webview);

    // Sets up an event listener to listen for messages passed from the webview view context
    // and executes code based on the message that is recieved
    this.setReclineWebviewEventListener(webviewView.webview);

    // Logs show up in bottom panel > Debug Console
    // console.log("registering listener")

    // Listen for when the panel becomes visible
    // https://github.com/microsoft/vscode-discussions/discussions/840
    if ("onDidChangeViewState" in webviewView) {
      // WebviewView and WebviewPanel have all the same properties except for this visibility listener
      // panel
      webviewView.onDidChangeViewState(
        () => {
          if (this.view?.visible) {
            void this.postMessageToWebview({ type: "action", action: "didBecomeVisible" });
          }
        },
        null,
        this.disposables
      );
    }
    else if ("onDidChangeVisibility" in webviewView) {
      // sidebar
      webviewView.onDidChangeVisibility(
        () => {
          if (this.view?.visible) {
            void this.postMessageToWebview({ type: "action", action: "didBecomeVisible" });
          }
        },
        null,
        this.disposables
      );
    }

    // Listen for when the view is disposed
    // This happens when the user closes the view or when the view is closed programmatically
    webviewView.onDidDispose(
      async () => {
        await this.dispose();
      },
      null,
      this.disposables
    );

    // Listen for when color changes
    vscode.workspace.onDidChangeConfiguration(
      async (e) => {
        if (e != null && e.affectsConfiguration("workbench.colorTheme")) {
          // Sends latest theme name to webview
          await this.postMessageToWebview({ type: "theme", text: JSON.stringify(await getTheme()) });
        }
      },
      null,
      this.disposables
    );

    // if the extension is starting a new session, clear previous task state
    void this.clearTask();

    this.outputChannel.appendLine("Webview view resolved");
  }

  async showTaskWithId(id: string): Promise<void> {
    if (id !== this.recline?.taskId) {
      // non-current task
      const { historyItem } = await this.getTaskWithId(id);
      await this.initReclineWithHistoryItem(historyItem); // clears existing task
    }
    await this.postMessageToWebview({ type: "action", action: "chatButtonClicked" });
  }

  // private async clearState() {
  // this.context.workspaceState.keys().forEach((key) => {
  // this.context.workspaceState.update(key, undefined)
  // })
  // this.context.globalState.keys().forEach((key) => {
  // this.context.globalState.update(key, undefined)
  // })
  // this.context.secrets.delete("apiKey")
  // }

  async updateCustomInstructions(instructions?: string): Promise<void> {
    // User may be clearing the field
    await this.updateGlobalState("customInstructions", instructions ?? undefined);
    if (this.recline) {
      this.recline.customInstructions = instructions ?? undefined;
    }
    await this.postStateToWebview();
  }

  async updateGlobalState(key: GlobalStateKey, value: any): Promise<void> {
    await this.context.globalState.update(key, value);
  }

  async updateTaskHistory(item: HistoryItem): Promise<HistoryItem[]> {
    const history = ((await this.getGlobalState("taskHistory")) as HistoryItem[] | undefined) ?? [];
    const existingItemIndex = history.findIndex(h => h.id === item.id);
    if (existingItemIndex !== -1) {
      history[existingItemIndex] = item;
    }
    else {
      history.push(item);
    }
    await this.updateGlobalState("taskHistory", history);
    return history;
  }
}
