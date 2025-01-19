import type { Mention } from "./types";

import * as vscode from "vscode";

import { workspaceRoot } from "@extension/constants";

import { MentionType } from "./types";
import { MentionParser } from "./MentionParser";
import { MentionContentFetcher } from "./MentionContentFetcher";


/**
 * Opens a mention in the appropriate context (file, folder, URL, etc.)
 */
export function openMention(mention?: string): void {
  if (mention == null || mention.length === 0) {
    return;
  }

  // Parse the raw mention to get its structured form
  try {
    const mentions = MentionParser.parseMentions(`@${mention}`);
    if (mentions.length === 0) {
      return;
    }

    const parsedMention = mentions[0];
    switch (parsedMention.type) {
      case MentionType.File:
      case MentionType.Folder:
        openFileSystemMention(parsedMention);
        break;

      case MentionType.Problems:
        vscode.commands.executeCommand("workbench.actions.view.problems");
        break;

      case MentionType.Url:
        vscode.env.openExternal(vscode.Uri.parse(parsedMention.value));
        break;
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to open mention: ${message}`);
  }
}

/**
 * Opens a file system mention (file or folder)
 */
function openFileSystemMention(mention: Mention): void {
  if (workspaceRoot == null || workspaceRoot.length === 0) {
    return;
  }

  const absPath = vscode.Uri.file(vscode.Uri.joinPath(vscode.Uri.file(workspaceRoot), mention.value).fsPath);

  if (mention.type === MentionType.Folder) {
    vscode.commands.executeCommand("revealInExplorer", absPath);
  }
  else {
    vscode.commands.executeCommand("vscode.open", absPath);
  }
}

/**
 * Parses mentions in text and fetches their content
 */
export async function parseMentions(text: string, cwd: string): Promise<string> {
  // Parse all mentions from text
  const mentions = MentionParser.parseMentions(text);
  if (mentions.length === 0) {
    return text;
  }

  // Replace mentions with readable labels
  let parsedText = MentionParser.replaceMentionsWithLabels(text);

  // Fetch content for all mentions
  const contentFetcher = new MentionContentFetcher(cwd);
  const contents = await contentFetcher.fetchContent(mentions);

  // Append each mention's content
  for (const { mention, content } of contents) {
    switch (mention.type) {
      case MentionType.Url:
        parsedText += `\n\n<url_content url="${mention.value}">\n${content}\n</url_content>`;
        break;

      case MentionType.File:
        parsedText += `\n\n<file_content path="${mention.value}">\n${content}\n</file_content>`;
        break;

      case MentionType.Folder:
        parsedText += `\n\n<folder_content path="${mention.value}">\n${content}\n</folder_content>`;
        break;

      case MentionType.Problems:
        parsedText += `\n\n<workspace_diagnostics>\n${content}\n</workspace_diagnostics>`;
        break;
    }
  }

  return parsedText;
}
