/**
 * Utility functions for sanitizing user input
 */

/**
 * Removes control characters and non-printable characters from text
 * while preserving newlines and Japanese characters
 */
export function sanitizeUserInput(text: string): string {
  return text
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/[\x00-\x09\x0B-\x1F]/g, "") // Remove control chars except newline
    .trim();
}

/**
 * Removes any shell prompt artifacts from terminal output
 * while preserving Japanese characters
 */
export function sanitizeTerminalOutput(text: string): string {
  return text
    .replace(/\r/g, "") // Remove standalone CR
    .replace(/[%$#>]\s*$/, "") // Remove shell prompts
    .replace(/[\x00-\x09\x0B-\x1F]/g, "") // Remove control chars
    .trim();
}