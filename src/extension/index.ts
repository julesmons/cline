import type { ReclineSDK } from "./lib/sdk/types/sdk";

import { Buffer } from "node:buffer";

import * as vscode from "vscode";

import { ReclineSDKFactory } from "./lib/sdk";
import { ReclineProvider } from "./ReclineProvider";
import { DIFF_VIEW_URI_SCHEME } from "./integrations/editor/diffView.provider";
import { registerEnvironmentCacheEvents } from "./integrations/workspace/environment-cache";

import "@common/polyfill/toPosix.polyfill";


let outputChannel: vscode.OutputChannel;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): ReclineSDK {

  outputChannel = vscode.window.createOutputChannel("Recline");
  context.subscriptions.push(outputChannel);

  outputChannel.appendLine("Recline extension activated");

  // Initialize environment info cache and register config change listeners
  registerEnvironmentCacheEvents(context);

  const sidebarProvider = new ReclineProvider(context, outputChannel);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ReclineProvider.sideBarId, sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("recline.plusButtonClicked", async () => {
      outputChannel.appendLine("Plus button Clicked");
      await sidebarProvider.clearTask();
      await sidebarProvider.postStateToWebview();
      await sidebarProvider.postMessageToWebview({ type: "action", action: "chatButtonClicked" });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("recline.mcpButtonClicked", async () => {
      await sidebarProvider.postMessageToWebview({ type: "action", action: "mcpButtonClicked" });
    })
  );

  const openReclineInNewTab = async (): Promise<void> => {
    outputChannel.appendLine("Opening Recline in new tab");
    // (this example uses webviewProvider activation event which is necessary to deserialize cached webview, but since we use retainContextWhenHidden, we don't need to use that event)
    // https://github.com/microsoft/vscode-extension-samples/blob/main/webview-sample/src/extension.ts
    const tabProvider = new ReclineProvider(context, outputChannel);
    // const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined
    const lastCol = Math.max(...vscode.window.visibleTextEditors.map(editor => editor.viewColumn ?? 0));

    // Check if there are any visible text editors, otherwise open a new group to the right
    const hasVisibleEditors = vscode.window.visibleTextEditors.length > 0;
    if (!hasVisibleEditors) {
      await vscode.commands.executeCommand("workbench.action.newGroupRight");
    }
    const targetCol = hasVisibleEditors ? Math.max(lastCol + 1, 1) : vscode.ViewColumn.Two;

    const panel = vscode.window.createWebviewPanel(ReclineProvider.tabPanelId, "Recline", targetCol, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [context.extensionUri]
    });

    panel.iconPath = {
      light: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "recline_light.svg"),
      dark: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "recline_dark.svg")
    };
    tabProvider.resolveWebviewView(panel);

    // Lock the editor group so clicking on files doesn't open them over the panel
    await vscode.commands.executeCommand("workbench.action.lockEditorGroup");
  };

  context.subscriptions.push(vscode.commands.registerCommand("recline.popoutButtonClicked", openReclineInNewTab));
  context.subscriptions.push(vscode.commands.registerCommand("recline.openInNewTab", openReclineInNewTab));

  context.subscriptions.push(
    vscode.commands.registerCommand("recline.settingsButtonClicked", async () => {
      await sidebarProvider.postMessageToWebview({ type: "action", action: "settingsButtonClicked" });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("recline.historyButtonClicked", async () => {
      await sidebarProvider.postMessageToWebview({ type: "action", action: "historyButtonClicked" });
    })
  );

  /*
  We use the text document content provider API to show the left side for diff view by creating a virtual document for the original content. This makes it readonly so users know to edit the right side if they want to keep their changes.

  - This API allows you to create readonly documents in VSCode from arbitrary sources, and works by claiming an uri-scheme for which your provider then returns text contents. The scheme must be provided when registering a provider and cannot change afterwards.
  - Note how the provider doesn't create uris for virtual documents - its role is to provide contents given such an uri. In return, content providers are wired into the open document logic so that providers are always considered.
  https://code.visualstudio.com/api/extension-guides/virtual-documents
  */
  const diffContentProvider = new (class implements vscode.TextDocumentContentProvider {
    provideTextDocumentContent(uri: vscode.Uri): string {
      return Buffer.from(uri.query, "base64").toString("utf-8");
    }
  })();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(DIFF_VIEW_URI_SCHEME, diffContentProvider)
  );

  // URI Handler
  const handleUri = async (uri: vscode.Uri): Promise<void> => {
    const path = uri.path;
    const query = new URLSearchParams(uri.query.replace(/\+/g, "%2B"));
    const visibleProvider = ReclineProvider.getVisibleInstance();
    if (!visibleProvider) {
      return;
    }
    switch (path) {
      case "/openrouter": {
        const code = query.get("code");
        if (code != null && code.length > 0) {
          await visibleProvider.handleOpenRouterCallback(code);
        }
        break;
      }
      default:
        break;
    }
  };
  context.subscriptions.push(vscode.window.registerUriHandler({ handleUri }));

  return ReclineSDKFactory.constructReclineSDK(outputChannel, sidebarProvider);
}

// This method is called when your extension is deactivated
export function deactivate(): void {
  outputChannel.appendLine("Recline extension deactivated");
}
