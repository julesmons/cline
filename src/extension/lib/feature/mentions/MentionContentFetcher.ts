import type { Mention, MentionContent } from "@extension/core/mentions";

import * as path from "node:path";

import * as vscode from "vscode";
import { isBinaryFile } from "isbinaryfile";

import { NetworkService } from "@extension/services/network";
import { MarkdownService } from "@extension/services/markdown";
import { diagnosticsMonitor } from "@extension/integrations/diagnostics/diagnostics.manager";
import { extractTextFromFile } from "@extension/integrations/misc/extract-text";
import { FileAccessError, MentionType, UrlFetchError } from "@extension/core/mentions";


export class MentionContentFetcher {

  constructor(private readonly cwd: string) {}

  /**
   * Fetches content for a single mention
   */
  private async fetchSingleMention(mention: Mention): Promise<MentionContent> {
    switch (mention.type) {
      case MentionType.File:
      case MentionType.Folder:
        return {
          mention,
          content: await this.getFileOrFolderContent(mention.value)
        };

      case MentionType.Url:
        try {
          const html = await NetworkService.fetch(mention.value);
          const markdown = await MarkdownService.fromHTML(html);
          return { mention, content: markdown };
        }
        catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new UrlFetchError(`Failed to fetch URL content: ${message}`);
        }

      case MentionType.Problems:
        return {
          mention,
          content: this.getWorkspaceProblems()
        };

      default:
        return {
          mention,
          content: `Unsupported mention type: ${mention.type as string}`
        };
    }
  }

  /**
   * Gets content from a file or folder path
   */
  private async getFileOrFolderContent(mentionPath: string): Promise<string> {
    // Handle paths consistently across systems
    const normalizedPath = mentionPath.replace(/\\/g, "/");
    const absPath = path.resolve(this.cwd, normalizedPath);
    const uri = vscode.Uri.file(absPath);

    try {
      const stat = await vscode.workspace.fs.stat(uri);
      const isFile = (stat.type & vscode.FileType.File) !== 0;
      const isDirectory = (stat.type & vscode.FileType.Directory) !== 0;

      if (isFile) {
        try {
          const isBinary = await isBinaryFile(absPath);
          if (isBinary) {
            return "(Binary file, unable to display content)";
          }
          return await extractTextFromFile(absPath);
        }
        catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new FileAccessError(`Failed to read file: ${message}`);
        }
      }

      if (isDirectory) {
        try {
          const entries = await vscode.workspace.fs.readDirectory(uri);
          let folderContent = "";
          const fileContentPromises: Promise<string | undefined>[] = [];

          // Sort entries for consistent display
          entries.sort(([nameA], [nameB]) => nameA.localeCompare(nameB));

          entries.forEach(([name, type], index) => {
            const isLast = index === entries.length - 1;
            const linePrefix = isLast ? "└── " : "├── ";

            // Add entry to tree view with proper type handling
            if (type === vscode.FileType.File) {
              folderContent += `${linePrefix}${name}\n`;
              const filePath = path.posix.join(normalizedPath, name);
              const entryUri = vscode.Uri.joinPath(uri, name);

              // Queue file content extraction
              fileContentPromises.push(
                this.tryGetFileContent(entryUri.fsPath, filePath)
              );
            }
            else if (type === vscode.FileType.Directory) {
              folderContent += `${linePrefix}${name}/\n`;
            }
            else if (type === vscode.FileType.SymbolicLink) {
              folderContent += `${linePrefix}${name} -> (symlink)\n`;
            }
            else {
              folderContent += `${linePrefix}${name}\n`;
            }
          });

          // Wait for all file contents to be extracted
          const fileContents = (await Promise.all(fileContentPromises)).filter(Boolean);
          return `${folderContent}\n${fileContents.join("\n\n")}`.trim();
        }
        catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new FileAccessError(`Failed to read directory: ${message}`);
        }
      }

      throw new FileAccessError(`Unsupported file system entry type: ${mentionPath}`);
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FileAccessError(`Failed to access path "${mentionPath}": ${errorMessage}`);
    }
  }

  /**
   * Gets formatted workspace diagnostic problems
   */
  private getWorkspaceProblems(): string {
    const diagnostics = vscode.languages.getDiagnostics();
    const result = diagnosticsMonitor.formatDiagnostics(
      diagnostics,
      [vscode.DiagnosticSeverity.Error, vscode.DiagnosticSeverity.Warning],
      this.cwd
    );
    return result || "No errors or warnings detected.";
  }

  /**
   * Attempts to get content from a file, returns undefined if not possible
   */
  private async tryGetFileContent(absolutePath: string, relativePath: string): Promise<string | undefined> {
    try {
      const isBinary = await isBinaryFile(absolutePath);
      if (isBinary) {
        return undefined;
      }

      const content = await extractTextFromFile(absolutePath);
      const normalizedPath = relativePath.replace(/\\/g, "/");

      // Return content with proper path formatting
      return `<file_content path="${normalizedPath}">\n${content}\n</file_content>`;
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.debug(`Failed to read file ${relativePath}: ${message}`);
      return undefined;
    }
  }

  /**
   * Fetches content for a list of mentions
   */
  public async fetchContent(mentions: Mention[]): Promise<MentionContent[]> {
    const contents: MentionContent[] = [];

    // Fetch content for each mention
    for (const mention of mentions) {
      try {
        const content = await this.fetchSingleMention(mention);
        contents.push(content);
      }
      catch (rawError) {
        const error = rawError instanceof Error ? rawError : new Error(String(rawError));
        contents.push({
          mention,
          content: `Error fetching content: ${error.message}`,
          error
        });
      }
    }

    return contents;
  }
}
