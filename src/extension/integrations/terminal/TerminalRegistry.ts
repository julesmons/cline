import * as vscode from "vscode";

import { extensionPath } from "@extension/constants";


export interface TerminalInfo {
  terminal: vscode.Terminal;
  busy: boolean;
  lastCommand: string;
  id: number;
}

// Although vscode.window.terminals provides a list of all open terminals, there's no way to know whether they're busy or not (exitStatus does not provide useful information for most commands). In order to prevent creating too many terminals, we need to keep track of terminals through the life of the extension, as well as session specific terminals for the life of a task (to get latest unretrieved output).
// Since we have promises keeping track of terminal processes, we get the added benefit of keep track of busy terminals even after a task is closed.
export class TerminalRegistry {
  private static nextTerminalId = 1;
  private static terminals: TerminalInfo[] = [];

  static createTerminal(cwd?: string | vscode.Uri | undefined): TerminalInfo {
    const terminal = vscode.window.createTerminal({
      cwd,
      name: "Recline",
      iconPath: vscode.Uri.file(
        vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
          ? `${extensionPath}/assets/icons/recline_dark.svg`
          : `${extensionPath}/assets/icons/recline_light.svg`
      )
    });
    const newInfo: TerminalInfo = {
      terminal,
      busy: false,
      lastCommand: "",
      id: this.nextTerminalId++
    };
    this.terminals.push(newInfo);
    return newInfo;
  }

  static getAllTerminals(): TerminalInfo[] {
    this.terminals = this.terminals.filter(t => !this.isTerminalClosed(t.terminal));
    return this.terminals;
  }

  static getTerminal(id: number): TerminalInfo | undefined {
    const terminalInfo = this.terminals.find(t => t.id === id);
    if (terminalInfo && this.isTerminalClosed(terminalInfo.terminal)) {
      this.removeTerminal(id);
      return undefined;
    }
    return terminalInfo;
  }

  // The exit status of the terminal will be undefined while the terminal is active. (This value is set when onDidCloseTerminal is fired.)
  private static isTerminalClosed(terminal: vscode.Terminal): boolean {
    return terminal.exitStatus !== undefined;
  }

  static removeTerminal(id: number): void {
    this.terminals = this.terminals.filter(t => t.id !== id);
  }

  static updateTerminal(id: number, updates: Partial<TerminalInfo>): void {
    const terminal = this.getTerminal(id);
    if (terminal) {
      Object.assign(terminal, updates);
    }
  }
}
