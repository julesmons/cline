import type * as vscode from "vscode";

import type { TerminalProcessEvents } from "./types";

import { EventEmitter } from "node:events";

import stripAnsi from "strip-ansi";

import { sanitizeTerminalOutput } from "@extension/utils/sanitize";


// Process timeouts
const PROCESS_HOT_TIMEOUT_NORMAL = 2_000;
const PROCESS_HOT_TIMEOUT_COMPILING = 15_000;

// Terminal-specific patterns
const LINE_ENDINGS = /\r\n|\r/g;
const VSCODE_PATTERNS = {
  // eslint-disable-next-line no-control-regex
  sequence: /\x1B\]633;.[^\x07]*\x07/g,
  commandStart: /\]633;C([\s\S]*?)\]633;D/,
  leadingNonAlpha: /^[^a-z0-9]*/i
} as const;

/**
 * Sanitize an array of terminal output lines
 */
function sanitizeLines(lines: string[]): string[] {
  return lines
    .map(line => sanitizeTerminalOutput(line))
    .filter(line => line.length > 0);
}

/**
 * Extract and sanitize VSCode command output from terminal data
 */
function extractVsCodeCommandOutput(data: string): string {
  const output = data.match(VSCODE_PATTERNS.commandStart)?.[1] ?? "";
  return sanitizeTerminalOutput(output);
}

/**
 * Process terminal output chunk, handling VSCode sequences and sanitization
 */
function processTerminalChunk(chunk: string): string {
  if (!chunk)
    return "";

  return stripAnsi(chunk)
    .split("\n")
    .map((line: string) => {
      const cleaned = sanitizeTerminalOutput(line);
      return cleaned.replace(VSCODE_PATTERNS.leadingNonAlpha, "");
    })
    .join("\n");
}

export class TerminalProcess extends EventEmitter<TerminalProcessEvents> {
  private buffer: string = "";
  private cooldownTimeout: number = PROCESS_HOT_TIMEOUT_NORMAL;
  private currentCommand: string = "";
  private fullOutput: string = "";
  private hasEmittedEmptyLine: boolean = false;
  private hasOutputNonCommand: boolean = false;
  private isDisposed: boolean = false;
  private isListening: boolean = true;
  private lastActivityTime: number = 0;
  private lastRetrievedIndex: number = 0;

  // Required elsewhere in the extension... TODO: Fix this hack
  public waitForShellIntegration: boolean = true;

  get isHot(): boolean {
    if (this.lastActivityTime === 0 || this.isDisposed)
      return false;
    return (Date.now() - this.lastActivityTime) < this.cooldownTimeout;
  }

  private cleanup(): void {
    if (this.isDisposed)
      return;

    this.isDisposed = true;
    this.isListening = false;
    this.buffer = "";
    this.fullOutput = "";
    this.lastActivityTime = 0;
    this.lastRetrievedIndex = 0;
    this.removeAllListeners();
  }

  private emitIfEol(chunk: string): void {
    if (this.isDisposed)
      return;

    this.buffer += chunk;
    this.buffer = this.buffer.replace(LINE_ENDINGS, "\n");

    let lineEndIndex = this.buffer.indexOf("\n");
    while (lineEndIndex !== -1) {
      const line = sanitizeTerminalOutput(this.buffer.slice(0, lineEndIndex));
      this.emit("line", line);
      this.buffer = this.buffer.slice(lineEndIndex + 1);
      lineEndIndex = this.buffer.indexOf("\n");
    }
  }

  private emitRemainingBufferIfListening(): void {
    if (this.isDisposed)
      return;

    if (this.buffer && this.isListening) {
      const remainingBuffer = this.sanitizeRemainingBuffer(this.buffer);
      if (remainingBuffer) {
        this.emit("line", remainingBuffer);
      }
      this.buffer = "";
      this.lastRetrievedIndex = this.fullOutput.length;
    }
  }

  private processChunk(data: string): void {
    if (!this.hasOutputNonCommand) {
      const lines = data.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (this.currentCommand.includes(lines[i].trim())) {
          lines.splice(i, 1);
          i--;
        }
        else {
          this.hasOutputNonCommand = true;
          break;
        }
      }
      data = lines.join("\n");
    }

    // Process the chunk with our sanitization utilities
    data = processTerminalChunk(data);

    const compilingMarkers = [
      "compiling",
      "building",
      "bundling",
      "transpiling",
      "generating",
      "starting"
    ];
    const markerNullifiers = [
      "compiled",
      "success",
      "finish",
      "complete",
      "succeed",
      "done",
      "end",
      "stop",
      "exit",
      "terminate",
      "error",
      "fail",
      "ready"
    ];

    const isCompiling = compilingMarkers.some(marker =>
      data.toLowerCase().includes(marker.toLowerCase())
    ) && !markerNullifiers.some(nullifier =>
      data.toLowerCase().includes(nullifier.toLowerCase())
    );

    this.updateHotState(isCompiling);

    if (!this.hasEmittedEmptyLine && !this.fullOutput && data) {
      this.emit("line", "");
      this.hasEmittedEmptyLine = true;
    }

    this.fullOutput += data;
    if (this.isListening) {
      this.emitIfEol(data);
      this.lastRetrievedIndex = this.fullOutput.length - this.buffer.length;
    }
  }

  private sanitizeRemainingBuffer(output: string): string {
    const lines = output.split("\n");
    const sanitizedLines = sanitizeLines(lines);
    return sanitizedLines.join("\n").trimEnd();
  }

  private updateHotState(isCompiling: boolean): void {
    if (this.isDisposed)
      return;

    this.lastActivityTime = Date.now();
    this.cooldownTimeout = isCompiling
      ? PROCESS_HOT_TIMEOUT_COMPILING
      : PROCESS_HOT_TIMEOUT_NORMAL;
  }

  continue(): void {
    if (this.isDisposed)
      return;

    this.emitRemainingBufferIfListening();
    this.isListening = false;
    this.removeAllListeners("line");
    this.emit("continue");
  }

  dispose(): void {
    this.cleanup();
  }

  getUnretrievedOutput(): string {
    if (this.isDisposed)
      return "";

    const unretrieved = this.fullOutput.slice(this.lastRetrievedIndex);
    this.lastRetrievedIndex = this.fullOutput.length;
    return this.sanitizeRemainingBuffer(unretrieved);
  }

  async run(terminal: vscode.Terminal, command: string): Promise<void> {
    if (this.isDisposed) {
      throw new Error("Terminal process has been disposed");
    }

    try {
      if (terminal.shellIntegration?.executeCommand) {
        const execution = terminal.shellIntegration.executeCommand(command);
        const stream = execution.read();
        // Reset state for new command
        this.currentCommand = command;
        this.hasOutputNonCommand = false;
        this.hasEmittedEmptyLine = false;
        let isFirstChunk = true;

        try {
          for await (const data of stream) {
            if (this.isDisposed) {
              throw new Error("Terminal process was disposed during execution");
            }

            if (isFirstChunk) {
              const outputBetweenSequences = extractVsCodeCommandOutput(data);
              const lastMatch = [...data.matchAll(VSCODE_PATTERNS.sequence)].pop();

              let processedData = data;
              if (lastMatch?.index !== undefined) {
                processedData = data.slice(lastMatch.index + lastMatch[0].length);
              }

              if (outputBetweenSequences) {
                processedData = `${outputBetweenSequences}\n${processedData}`;
              }
              processedData = processTerminalChunk(processedData);
              isFirstChunk = false;
              this.processChunk(processedData);
            }
            else {
              this.processChunk(processTerminalChunk(data));
            }
          }

          if (!this.isDisposed) {
            this.emitRemainingBufferIfListening();
            this.lastActivityTime = 0;
            this.emit("completed");
            this.emit("continue");
          }
        }
        catch (error: unknown) {
          console.error("Error processing terminal stream:", error);
          this.cleanup();
          this.emit("error", error instanceof Error ? error : new Error(String(error)));
          throw error instanceof Error ? error : new Error(String(error));
        }
      }
      else {
        terminal.sendText(command, true);
        this.emit("completed");
        this.emit("continue");
        this.emit("no_shell_integration");
      }
    }
    catch (error: unknown) {
      console.error("Terminal execution error:", error);
      this.cleanup();
      this.emit("error", error instanceof Error ? error : new Error(String(error)));
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}

export type TerminalProcessResultPromise = TerminalProcess & Promise<void>;

export function mergePromise(
  terminalProcess: TerminalProcess,
  promise: Promise<void>
): TerminalProcessResultPromise {
  // Explicitly type Promise methods
  interface PromiseApi {
    then: <T, R>(
      onfulfilled?: ((value: T) => R | PromiseLike<R>) | null,
      onrejected?: ((reason: any) => R | PromiseLike<R>) | null
    ) => Promise<R>;
    catch: <T>(onrejected?: ((reason: any) => T | PromiseLike<T>) | null) => Promise<T>;
    finally: (onfinally?: (() => void) | null) => Promise<void>;
  }

  const proto = Object.getPrototypeOf(promise) as PromiseApi | null;

  // Validate promise prototype
  if (proto === null || !Object.prototype.hasOwnProperty.call(proto, "then")) {
    throw new Error("Invalid promise prototype: missing required methods");
  }

  // Type-safe promise method binding with explicit property checks
  const methodNames = ["then", "catch", "finally"] as const;
  methodNames.forEach((method) => {
    const fn = proto[method];
    if (typeof fn === "function") {
      const boundMethod = fn.bind(promise);
      Object.defineProperty(terminalProcess, method, {
        enumerable: true,
        configurable: true,
        writable: true,
        value: boundMethod
      });
    }
  });

  return terminalProcess as TerminalProcessResultPromise;
}
