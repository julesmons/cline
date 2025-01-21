import type { TerminalInfo } from "./TerminalRegistry";
import type { TerminalProcessResultPromise } from "./TerminalProcess";

import * as vscode from "vscode";
import pWaitFor from "p-wait-for";

import { arePathsEqual } from "@common/utils/filesystem/path";

import { TerminalRegistry } from "./TerminalRegistry";
import { mergePromise, TerminalProcess } from "./TerminalProcess";


export class TerminalManager {
  private disposables: vscode.Disposable[] = [];
  private processes: Map<number, TerminalProcess> = new Map();
  private terminalIds: Set<number> = new Set();

  constructor() {

    let disposable: vscode.Disposable | undefined;

    try {
      if ("onDidStartTerminalShellExecution" in vscode.window) {
        disposable = vscode.window.onDidStartTerminalShellExecution(async (e) => {
          // Create read stream to stabilize terminal output
          e?.execution?.read();
        });
      }
    }
    catch (error) {
      console.error("Error setting up onDidEndTerminalShellExecution", error);
    }

    if (disposable) {
      this.disposables.push(disposable);
    }
  }

  async disposeAll(): Promise<void> {

    this.terminalIds.clear();
    this.processes.clear();

    for (const disposable of this.disposables) {
      disposable.dispose();
    }

    this.disposables = [];
  }

  async getOrCreateTerminal(cwd: string): Promise<TerminalInfo> {

    // Find available terminal from our pool first (created for this task)
    const availableTerminal = TerminalRegistry.getAllTerminals().find((t) => {

      if (t.busy) {
        return false;
      }

      const terminalCwd = t.terminal.shellIntegration?.cwd; // one of cline's commands could have changed the cwd of the terminal

      if (!terminalCwd) {
        return false;
      }

      return arePathsEqual(vscode.Uri.file(cwd).fsPath, terminalCwd.fsPath);
    });

    if (availableTerminal) {

      this.terminalIds.add(availableTerminal.id);
      return availableTerminal;
    }

    const newTerminalInfo = TerminalRegistry.createTerminal(cwd);
    this.terminalIds.add(newTerminalInfo.id);
    return newTerminalInfo;
  }

  getTerminals(busy: boolean): { id: number; lastCommand: string }[] {
    return Array.from(this.terminalIds)
      .map(id => TerminalRegistry.getTerminal(id))
      .filter((t): t is TerminalInfo => t !== undefined && t.busy === busy)
      .map(t => ({ id: t.id, lastCommand: t.lastCommand }));
  }

  getUnretrievedOutput(terminalId: number): string {
    if (!this.terminalIds.has(terminalId)) {
      return "";
    }
    const process = this.processes.get(terminalId);
    return process ? process.getUnretrievedOutput() : "";
  }

  isProcessHot(terminalId: number): boolean {
    const process = this.processes.get(terminalId);
    return process ? process.isHot : false;
  }

  runCommand(terminalInfo: TerminalInfo, command: string): TerminalProcessResultPromise {
    terminalInfo.busy = true;
    terminalInfo.lastCommand = command;
    const terminalProcess = new TerminalProcess();
    this.processes.set(terminalInfo.id, terminalProcess);

    terminalProcess.once("completed", () => {
      terminalInfo.busy = false;
    });

    // if shell integration is not available, remove terminal so it does not get reused as it may be running a long-running process
    terminalProcess.once("no_shell_integration", () => {
      console.log(`no_shell_integration received for terminal ${terminalInfo.id}`);
      // Remove the terminal so we can't reuse it (in case it's running a long-running process)
      TerminalRegistry.removeTerminal(terminalInfo.id);
      this.terminalIds.delete(terminalInfo.id);
      this.processes.delete(terminalInfo.id);
    });

    const promise = new Promise<void>((resolve, reject) => {
      terminalProcess.once("continue", () => {
        resolve();
      });
      terminalProcess.once("error", (error) => {
        console.error(`Error in terminal ${terminalInfo.id}:`, error);
        reject(error);
      });
    });

    // if shell integration is already active, run the command immediately
    if (terminalInfo.terminal.shellIntegration) {
      terminalProcess.waitForShellIntegration = false;
      void terminalProcess.run(terminalInfo.terminal, command);
    }
    else {
      // docs recommend waiting 3s for shell integration to activate
      void pWaitFor(() => terminalInfo.terminal.shellIntegration !== undefined, { timeout: 4000 })
        .finally(() => {
          const existingProcess = this.processes.get(terminalInfo.id);
          if (existingProcess && existingProcess.waitForShellIntegration) {
            existingProcess.waitForShellIntegration = false;
            void existingProcess.run(terminalInfo.terminal, command);
          }
        });
    }

    return mergePromise(terminalProcess, promise);
  }
}
