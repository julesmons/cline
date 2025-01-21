import { NotificationService } from "@extension/services/notifications/notification.service";

import { COMMENT_PATTERNS, OMISSION_KEYWORDS } from "./constants";


export abstract class OmissionManager {

  /**
   * Detects potential AI-generated code omissions in the given file content.
   * @param originalFileContent The original content of the file.
   * @param newFileContent The new content of the file to check.
   * @returns True if a potential omission is detected, false otherwise.
   */
  static detectCodeOmission(originalFileContent: string, newFileContent: string): boolean {
    const originalLines = new Set(originalFileContent.split("\n"));
    let inMultilineComment = false;

    for (const line of newFileContent.split("\n")) {
      const trimmedLine = line.trim();
      const lineLC = line.toLowerCase();

      // Handle multi-line comment state
      if (trimmedLine.includes("/*")) {
        inMultilineComment = true;
      }
      if (trimmedLine.includes("*/")) {
        inMultilineComment = false;
      }

      // Skip empty lines or lines that exactly match the original
      if (!trimmedLine || originalLines.has(line)) {
        continue;
      }

      // Check if this line is a comment
      const isComment = (
        inMultilineComment || COMMENT_PATTERNS.some(pattern => pattern.test(line))
      );

      if (isComment) {
        // Split into words and check for omission keywords
        const words = lineLC.split(/[\s,.;:\-_]+/);
        if (words.some(word => OMISSION_KEYWORDS.has(word))) {
          return true;
        }

        // Check for phrases like "code continues" or "rest of implementation"
        if (/(?:code|implementation|function|method|class)\s+(?:continue|remain)s?/.test(lineLC)) {
          return true;
        }
      }
    }

    return false;
  }

  static async showCodeOmissionWarning(): Promise<void> {
    await NotificationService.showWarning({
      title: "Potential code truncation detected",
      message: "Truncation usually occurs when the AI model reaches its max output limit."
    });
  }
}
