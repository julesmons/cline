import * as vscode from "vscode";
import Parser from "web-tree-sitter";

import { extensionUri } from "@extension/constants";

import { supportedQueries } from "./queries";
import { importTreeSitterWasm } from "./wasm";
import { extensionToLanguage } from "./supported";


export interface LanguageParser {
  parser: Parser;
  query: Parser.Query;
}

export class LanguageParserManager {

  private isInitialized: boolean = false;
  private parsers: Map<string, LanguageParser> = new Map<string, LanguageParser>();

  private async createParser(ext: string): Promise<LanguageParser> {
    const supportedLanguage = extensionToLanguage.get(ext);
    if (!supportedLanguage) {
      throw new Error(`Unsupported extension: ${ext}`);
    }

    const wasm = await importTreeSitterWasm(supportedLanguage);
    const language = await Parser.Language.load(wasm);

    const rawQuery = supportedQueries.get(supportedLanguage);
    if (rawQuery == null || rawQuery === "") {
      throw new Error(`Unsupported language: ${supportedLanguage}`);
    }

    const query = language.query(rawQuery);
    const parser = new Parser();
    parser.setLanguage(language);

    return { parser, query };
  }

  private async initialize(): Promise<void> {

    if (this.isInitialized) {
      return;
    }

    const wasmUrl = await import("web-tree-sitter/tree-sitter.wasm");
    const fileName: string = wasmUrl.default.toString().split("/").pop() ?? "tree-sitter.wasm";
    const wasmPath: vscode.Uri = vscode.Uri.joinPath(extensionUri, "dist", "assets", fileName);

    await Parser.init({
      locateFile(_scriptName: string, _scriptDirectory: string): string {
        return wasmPath.fsPath;
      }
    });

    this.isInitialized = true;
  }

  public async getParser(ext: string): Promise<LanguageParser> {
    if (!ext) {
      throw new Error("No source-file extension provided.");
    }

    await this.initialize();

    if (!this.parsers.has(ext)) {
      this.parsers.set(ext, await this.createParser(ext));
    }

    return this.parsers.get(ext)!;
  }

  public async getParsers(fileExtensions: string[]): Promise<Map<string, LanguageParser>> {
    await Promise.all(fileExtensions.map(async ext => this.getParser(ext)));
    const result = new Map<string, LanguageParser>();

    for (const ext of fileExtensions) {
      const parser = this.parsers.get(ext);
      if (parser) {
        result.set(ext, parser);
      }
    }

    return result;
  }
}

// Singleton
export const languageParser = new LanguageParserManager();
