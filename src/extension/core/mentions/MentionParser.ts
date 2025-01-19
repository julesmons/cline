import type { Mention } from "./types";

import { statSync } from "node:fs";
import { resolve } from "node:path";

import { mentionRegexGlobal } from "@shared/context-mentions";

import { workspaceRoot } from "@extension/constants";

import { InvalidMentionError, MentionType } from "./types";


/**
 * Handles parsing and validation of mentions in text
 */
export class MentionParser {
  /**
   * Creates a structured Mention object from a raw mention string
   */
  private static createMention(value: string, raw: string): Mention {
    if (!value) {
      throw new InvalidMentionError("Empty mention value");
    }

    // URL mention
    if (value.startsWith("http")) {
      return {
        type: MentionType.Url,
        value,
        raw
      };
    }

    // File system mention
    if (value.startsWith("/")) {
      const mentionPath = value.slice(1);
      const mentionStat = statSync(resolve(workspaceRoot, mentionPath)); // @TODO: Replace with vscode fs??
      return {
        type: mentionStat.isDirectory() ? MentionType.Folder : MentionType.File,
        value: mentionPath,
        raw
      };
    }

    // Problems mention
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
        if (error instanceof InvalidMentionError) {
          console.warn(`Skipping invalid mention: ${error.message}`);
        }
        else {
          throw error;
        }
      }
    }

    return mentions;
  }

  /**
   * Replaces mentions in text with a more readable format
   */
  public static replaceMentionsWithLabels(text: string): string {
    return text.replace(mentionRegexGlobal, (match, mention) => {
      if (mention.startsWith("http")) {
        return `'${mention}' (see below for site content)`;
      }
      else if (mention.startsWith("/")) {
        const mentionPath = mention.slice(1);
        return mentionPath.endsWith("/")
          ? `'${mentionPath}' (see below for folder content)`
          : `'${mentionPath}' (see below for file content)`;
      }
      else if (mention === "problems") {
        return `Workspace Problems (see below for diagnostics)`;
      }
      return match;
    });
  }
}
