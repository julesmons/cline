import type Parser from "web-tree-sitter";


/**
 * Position in a source code file
 */
export interface TreeSitterPosition {
  row: number;
  column: number;
}

/**
 * Node in the AST that represents a captured syntax element
 */
export interface TreeSitterNode {
  startPosition: TreeSitterPosition;
  endPosition: TreeSitterPosition;
  text: string;
}

/**
 * Represents a matching capture from a tree-sitter query
 */
export interface CaptureMatch {
  name: string;
  node: TreeSitterNode;
  pattern?: number;
}

/**
 * Result from parsing a file's definitions
 */
export interface DefinitionParseResult {
  relativePath: string;
  definitions?: string;
}

/**
 * Tree-sitter language-specific parser configuration
 */
export interface TreeSitterParser {
  parser: Parser;
  query: Parser.Query;
}
