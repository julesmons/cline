import { statSync } from "node:fs";
import { resolve } from "node:path";

import { mentionRegexGlobal } from "@shared/context-mentions";

import { workspaceRoot } from "@extension/constants";

import { InvalidMentionError, type Mention, MentionType } from "./types";


/**
 * Handles parsing and validation of mentions in text
 */
export class MentionParser {

  /**
   * Creates a structured Mention object from a raw mention string
   */
  private static createMention(value: string, raw: string): Mention {

    if (value == null || value.length === 0) {
      throw new InvalidMentionError("Empty mention value");
    }

    // Handle URL mention
    if (value.startsWith("http")) {
      return {
        type: MentionType.Url,
        value,
        raw
      };
    }

    // Handle file system mention
    if (value.startsWith("/")) {
      const mentionPath = value.slice(1);
      const mentionStat = statSync(resolve(workspaceRoot, mentionPath)); // @TODO: Replace with vscode fs??
      return {
        type: mentionStat.isDirectory() ? MentionType.Folder : MentionType.File,
        value: mentionPath,
        raw
      };
    }

    // Handle problems mention
    if (value === "problems") {
      return {
        type: MentionType.Problems,
        value,
        raw
      };
    }

    throw new InvalidMentionError(`Invalid mention format: ${value}`);
  }

  /**
   * Parses all mentions from the given text
   */
  public static parseMentions(text: string): Mention[] {

    const mentions: Mention[] = [];
    const matches = text.matchAll(mentionRegexGlobal);

    for (const match of matches) {

      try {

        const mention = MentionParser.createMention(match[1], match[0]);
        mentions.push(mention);
      }
      catch (error) {

        // Skip invalid mentions
        if (error instanceof InvalidMentionError) {
          console.warn(`Skipping invalid mention: ${error.message}`);
          continue;
        }

        // Re-throw other errors
        throw error;
      }
    }

    return mentions;
  }

  /**
   * Replaces mentions in text with a more readable format
   */
  public static replaceMentionsWithLabels(text: string): string {

    return text.replace(mentionRegexGlobal, (match: string, mention: string): string => {

      // Handle URL mentions
      if (mention.startsWith("http")) {
        return `'${mention}' (see below for site content)`;
      }

      // Handle file system mentions
      if (mention.startsWith("/")) {
        const mentionPath = mention.slice(1);
        return mentionPath.endsWith("/")
          ? `'${mentionPath}' (see below for folder content)`
          : `'${mentionPath}' (see below for file content)`;
      }

      // Handle problems mention
      if (mention === "problems") {
        return `Workspace Problems (see below for diagnostics)`;
      }

      return match;
    });
  }
}
