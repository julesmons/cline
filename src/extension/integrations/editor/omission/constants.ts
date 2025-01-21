// Pre-compile patterns for better performance
export const COMMENT_PATTERNS = [
  /^\s*\/\//, // Single-line comment for most languages
  /^\s*#/, // Single-line comment for Python, Ruby, etc.
  /^\s*\/\*/, // Multi-line comment opening
  /^\s*\*\//, // Multi-line comment closing
  /^\s*\*/, // Multi-line comment continuation
  /^\s*\{\s*\/\*/, // JSX comment opening
  /^\s*<!--/, // HTML comment opening
  /^\s*-->/ // HTML comment closing
] as const;

// Extended set of keywords that might indicate code omissions
export const OMISSION_KEYWORDS = new Set([
  "remain",
  "remains",
  "unchanged",
  "rest",
  "previous",
  "existing",
  "continue",
  "continues",
  "same",
  "before",
  "original",
  "skip",
  "omit",
  "etc",
  "...",
  "…" // Unicode ellipsis
]);
