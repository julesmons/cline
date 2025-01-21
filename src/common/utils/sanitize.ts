import validator from "validator";
import stripAnsi from "strip-ansi";


// Unicode-aware regex patterns for handling terminal and code syntax
const SHELL_PROMPT = /[%$#>]\s*$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\v\f\x0E-\x1F]/g; // Control chars except tab, newline, and carriage return

export interface SanitizeOptions {
  /** Whether to preserve newlines. Defaults to true. */
  preserveNewlines?: boolean;
  /** Whether to strip ANSI escape sequences. Defaults to true. */
  stripAnsi?: boolean;
  /** Whether to remove shell prompts. Defaults to false. */
  removePrompts?: boolean;
}

/**
 * Core sanitization function that handles various text cleaning needs
 * while properly preserving valid characters including Unicode.
 * Uses validator.js for robust character handling and stripAnsi for terminal output.
 */
function sanitizeText(text: string, options: SanitizeOptions = {}): string {
  const {
    preserveNewlines = true,
    stripAnsi: shouldStripAnsi = true,
    removePrompts = false
  } = options;

  if (typeof text !== "string") {
    return "";
  }

  let result = text;

  // Step 1: Handle ANSI escape sequences
  if (shouldStripAnsi) {
    result = stripAnsi(result);
  }

  // Step 2: Normalize line endings and handle control characters
  result = result
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(CONTROL_CHARS, "");

  // Step 3: Strip low ASCII while preserving newlines if requested
  try {
    // validator.stripLow may throw on invalid UTF-8
    result = validator.stripLow(result, preserveNewlines);
  }
  catch (err) {
    // Fallback to basic control char removal if validator fails
    console.warn("validator.stripLow failed, using fallback", err);
    if (!preserveNewlines) {
      result = result.replace(/\n/g, "");
    }
  }

  // Step 4: Handle shell prompts if requested
  if (removePrompts) {
    result = result.replace(SHELL_PROMPT, "");
  }

  return result.trim();
}

/**
 * Sanitizes user input while properly preserving Unicode characters and newlines
 */
export function sanitizeUserInput(text: string): string {
  return sanitizeText(text, {
    preserveNewlines: true,
    stripAnsi: true,
    removePrompts: false
  });
}

/**
 * Sanitizes terminal output with special handling for shell artifacts
 */
export function sanitizeTerminalOutput(text: string): string {
  return sanitizeText(text, {
    preserveNewlines: true,
    stripAnsi: true,
    removePrompts: true
  });
}
