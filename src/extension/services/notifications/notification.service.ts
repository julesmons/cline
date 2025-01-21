import type { NotificationOptions } from "./types/notificationOptions";

import * as vscode from "vscode";


export abstract class NotificationService {

  private static formatMessage(title: string | undefined, message: string): string {
    if (title === undefined || title === null) {
      return message;
    }

    if (typeof title !== "string") {
      return message;
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      return message;
    }

    return `${trimmedTitle}: ${message}`;
  }

  /**
   * Shows an information message
   */
  static async showInfo(options: NotificationOptions): Promise<string | undefined> {
    const message = NotificationService.formatMessage(options.title, options.message);
    const items = options.actions || [];

    if (options.modal) {
      return vscode.window.showInformationMessage(message, { modal: true }, ...items);
    }
    return vscode.window.showInformationMessage(message, ...items);
  }

  /**
   * Shows a warning message
   */
  static async showWarning(options: NotificationOptions): Promise<string | undefined> {
    const message = NotificationService.formatMessage(options.title, options.message);
    const items = options.actions || [];

    if (options.modal) {
      return vscode.window.showWarningMessage(message, { modal: true }, ...items);
    }
    return vscode.window.showWarningMessage(message, ...items);
  }

  /**
   * Shows an error message
   */
  static async showError(options: NotificationOptions): Promise<string | undefined> {
    const message = NotificationService.formatMessage(options.title, options.message);
    const items = options.actions || [];

    if (options.modal) {
      return vscode.window.showErrorMessage(message, { modal: true }, ...items);
    }
    return vscode.window.showErrorMessage(message, ...items);
  }

  /**
   * Shows a progress notification
   */
  static async withProgress<T>(
    title: string,
    task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>
  ): Promise<T> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: false
      },
      task
    );
  }

  /**
   * Shows a notification with an input box
   */
  static async showInputBox(options: vscode.InputBoxOptions): Promise<string | undefined> {
    return vscode.window.showInputBox(options);
  }

  /**
   * Shows a notification with a quick pick selection
   */
  static async showQuickPick(
    items: string[] | Thenable<string[]>,
    options?: vscode.QuickPickOptions
  ): Promise<string | undefined> {
    return vscode.window.showQuickPick(items, options);
  }
}
