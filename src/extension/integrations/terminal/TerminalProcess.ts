import type * as vscode from "vscode";

import type { TerminalProcessEvents } from "./types";

import { EventEmitter } from "node:events";

import stripAnsi from "strip-ansi";


const PROCESS_HOT_TIMEOUT_NORMAL = 2_000;
const PROCESS_HOT_TIMEOUT_COMPILING = 15_000;

const regexes = {
  LINE_ENDINGS: /\r\n/g,
  STANDALONE_CR: /\r/g,
  NON_ASCII_CONTROL: /[\x00-\x09\x0B-\x1F\x7F-\uFFFF]/g,
  PROMPT_CHARS: /[%$#>]\s*$/,
  VS_CODE_SEQUENCE: /\x1B\]633;.[^\x07]*\x07/g,
  NON_PRINTABLE: /[^\x20-\x7E]/g,
  COMMAND_START_SEQUENCE: /\]633;C([\s\S]*?)\]633;D/,
  LEADING_NON_ALPHANUMERIC: /^[^a-z0-9]*/i,
  RANDOM_COMMAS: /,/g
};

function sanitizeOutput(output: string): string {
  return output
    .replace(regexes.LINE_ENDINGS, "\n")
    .replace(regexes.STANDALONE_CR, "")
    .replace(regexes.NON_ASCII_CONTROL, "")
    .trim();
}

function sanitizeLines(lines: string[]): string[] {
  return lines
    .map(line =>
      line
        .replace(regexes.PROMPT_CHARS, "")
        .replace(regexes.NON_ASCII_CONTROL, "")
        .trim()
    )
    .filter(line => line.length > 0);
}

function extractVsCodeCommandOutput(data: string): string {
  const output = data.match(regexes.COMMAND_START_SEQUENCE)?.[1] || "";
  return sanitizeOutput(output).trim();
}

export class TerminalProcess extends EventEmitter<TerminalProcessEvents> {
  private buffer: string = "";
  private cooldownTimeout: number = PROCESS_HOT_TIMEOUT_NORMAL;
  private fullOutput: string = "";
  private isListening: boolean = true;
  private lastActivityTime: number = 0;
  private lastRetrievedIndex: number = 0;
  // Required elsewhere in the extension... TODO: Fix this hack
  public waitForShellIntegration: boolean = true;

  get isHot(): boolean {
    if (this.lastActivityTime === 0)
      return false;
    return Date.now() - this.lastActivityTime < this.cooldownTimeout;
  }

  private emitIfEol(chunk: string) {
    this.buffer += chunk;
    this.buffer = this.buffer.replace(regexes.LINE_ENDINGS, "\n");

    let lineEndIndex: number;
    while ((lineEndIndex = this.buffer.indexOf("\n")) !== -1) {
      const line = sanitizeOutput(this.buffer.slice(0, lineEndIndex));
      this.emit("line", line);
      this.buffer = this.buffer.slice(lineEndIndex + 1);
    }
  }

  private emitRemainingBufferIfListening() {
    if (this.buffer && this.isListening) {
      const remainingBuffer = this.sanitizeRemainingBuffer(this.buffer);
      if (remainingBuffer) {
        this.emit("line", remainingBuffer);
      }
      this.buffer = "";
      this.lastRetrievedIndex = this.fullOutput.length;
    }
  }

  private sanitizeRemainingBuffer(output: string): string {
    const lines = output.split("\n");
    const sanitizedLines = sanitizeLines(lines);
    return sanitizedLines.join("\n").trimEnd();
  }

  private updateHotState(isCompiling: boolean) {
    this.lastActivityTime = Date.now();
    this.cooldownTimeout = isCompiling
      ? PROCESS_HOT_TIMEOUT_COMPILING
      : PROCESS_HOT_TIMEOUT_NORMAL;
  }

  continue() {
    this.emitRemainingBufferIfListening();
    this.isListening = false;
    this.removeAllListeners("line");
    this.emit("continue");
  }

  getUnretrievedOutput(): string {
    const unretrieved = this.fullOutput.slice(this.lastRetrievedIndex);
    this.lastRetrievedIndex = this.fullOutput.length;
    return this.sanitizeRemainingBuffer(unretrieved);
  }

  async run(terminal: vscode.Terminal, command: string) {
    if (terminal.shellIntegration?.executeCommand) {
      const execution = terminal.shellIntegration.executeCommand(command);
      const stream = execution.read();
      let isFirstChunk = true;
      let didOutputNonCommand = false;
      let didEmitEmptyLine = false;

      for await (let data of stream) {
        if (isFirstChunk) {
          const outputBetweenSequences = extractVsCodeCommandOutput(data);
          const lastMatch = [...data.matchAll(regexes.VS_CODE_SEQUENCE)].pop();

          if (lastMatch?.index !== undefined) {
            data = data.slice(lastMatch.index + lastMatch[0].length);
          }

          if (outputBetweenSequences) {
            data = `${outputBetweenSequences}\n${data}`;
          }
          data = stripAnsi(data)
            .split("\n")
            .map((line, index) => {
              if (index === 0 && line[0] === line[1]) {
                line = line.slice(1);
              }
              return line.replace(regexes.LEADING_NON_ALPHANUMERIC, "");
            })
            .join("\n");
          isFirstChunk = false;
        }
        else {
          data = stripAnsi(data)
            .split("\n")
            .map(line => line.replace(regexes.NON_PRINTABLE, ""))
            .join("\n");
        }

        if (!didOutputNonCommand) {
          const lines = data.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (command.includes(lines[i].trim())) {
              lines.splice(i, 1);
              i--;
            }
            else {
              didOutputNonCommand = true;
              break;
            }
          }
          data = lines.join("\n");
        }

        data = data.replace(regexes.RANDOM_COMMAS, "");

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

        const isCompiling
          = compilingMarkers.some(marker =>
            data.toLowerCase().includes(marker.toLowerCase())
          )
          && !markerNullifiers.some(nullifier =>
            data.toLowerCase().includes(nullifier.toLowerCase())
          );

        this.updateHotState(isCompiling);

        if (!didEmitEmptyLine && !this.fullOutput && data) {
          this.emit("line", "");
          didEmitEmptyLine = true;
        }

        this.fullOutput += data;
        if (this.isListening) {
          this.emitIfEol(data);
          this.lastRetrievedIndex = this.fullOutput.length - this.buffer.length;
        }
      }

      this.emitRemainingBufferIfListening();
      this.lastActivityTime = 0;
      this.emit("completed");
      this.emit("continue");
    }
    else {
      terminal.sendText(command, true);
      this.emit("completed");
      this.emit("continue");
      this.emit("no_shell_integration");
    }
  }
}

export type TerminalProcessResultPromise = TerminalProcess & Promise<void>;

export function mergePromise(
  process: TerminalProcess,
  promise: Promise<void>
): TerminalProcessResultPromise {
  const nativePromisePrototype = (async () => {})().constructor.prototype;
  const descriptors = ["then", "catch", "finally"].map(property => [
    property,
    Reflect.getOwnPropertyDescriptor(nativePromisePrototype, property)
  ]);
  for (const [property, descriptor] of descriptors) {
    if (descriptor) {
      const value = descriptor.value.bind(promise);
      Reflect.defineProperty(process, property, { ...descriptor, value });
    }
  }
  return process as TerminalProcessResultPromise;
}
