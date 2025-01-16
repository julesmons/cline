import type { CaptureMatch } from "./types";
import type { LanguageParser } from "./languageParser";

import * as path from "node:path";
import * as fs from "node:fs/promises";

import { listFiles } from "@extension/services/fd";
import { fileExistsAtPath } from "@extension/utils/fs";

import { supportedExtensions } from "./supported";
import { languageParser } from "./languageParser";


interface FileInfo {
  path: string;
  extension: string;
}

interface ParseResult {
  relativePath: string;
  definitions: string | undefined;
}

/**
 * Filter files by supported extensions and return FileInfo objects
 * Limits number of files to parse to avoid performance issues
 */
function filterSupportedFiles(filePaths: string[], maxFiles = 50): FileInfo[] {
  const supportedExtSet = new Set(supportedExtensions);
  const result: FileInfo[] = [];

  for (const filePath of filePaths) {
    if (result.length >= maxFiles)
      break;

    const ext = path.extname(filePath).toLowerCase().slice(1);
    if (supportedExtSet.has(ext)) {
      result.push({ path: filePath, extension: ext });
    }
  }

  return result;
}

/**
 * Parse a single file using tree-sitter and extract definitions
 * Returns formatted output string or undefined if no definitions found
 */
async function parseFile(fileInfo: FileInfo, parsers: Map<string, LanguageParser>): Promise<string | undefined> {
  const parser = parsers.get(fileInfo.extension);
  if (!parser) {
    return undefined;
  }

  try {
    const content = await fs.readFile(fileInfo.path, "utf8");
    const tree = parser.parser.parse(content);
    const captures = parser.query.captures(tree.rootNode);

    if (captures.length === 0) {
      return undefined;
    }

    const lines = content.split("\n");
    const formattedOutput = formatCaptures(captures as CaptureMatch[], lines);
    return (formattedOutput != null && formattedOutput.length > 0) ? `|----\n${formattedOutput}|----\n` : undefined;

  }
  catch (error) {
    console.error(`Error parsing file ${fileInfo.path}:`, error);
    return undefined;
  }
}

/**
 * Format tree-sitter captures into a readable string output
 * Returns undefined if no valid captures found
 */
function formatCaptures(captures: CaptureMatch[], lines: string[]): string | undefined {
  let output = "";
  let lastLine = -1;

  // Sort captures by line number for consistent output
  captures.sort((a, b) => a.node.startPosition.row - b.node.startPosition.row);

  for (const { node, name } of captures) {
    // Skip non-name captures
    if (!name.includes("name")) {
      continue;
    }

    const startLine = node.startPosition.row;
    if (startLine < 0 || startLine >= lines.length) {
      continue;
    }

    // Add separator between non-consecutive captures
    if (lastLine !== -1 && startLine > lastLine + 1) {
      output += "|----\n";
    }

    output += `│${lines[startLine]}\n`;
    lastLine = node.endPosition.row;
  }

  return output || undefined;
}

/**
 * Parse source code files in a directory or single file for definitions
 * Returns formatted string containing definitions or appropriate message
 */
export async function parseSourceCodeForDefinitionsTopLevel(inputPath: string): Promise<string> {
  try {
    const resolvedPath = path.resolve(inputPath);
    if (!await fileExistsAtPath(resolvedPath)) {
      return "This path does not exist or you do not have permission to access it.";
    }

    const stats = await fs.stat(resolvedPath);
    const filesToParse = stats.isFile()
      ? [{ path: resolvedPath, extension: path.extname(resolvedPath).toLowerCase().slice(1) }]
      : filterSupportedFiles(await listFiles(resolvedPath, { recursive: false, limit: 200 }).then(([files]) => files));

    const supportedFiles = filesToParse.filter(f => supportedExtensions.includes(f.extension));
    if (supportedFiles.length === 0) {
      return "No supported files found.";
    }

    // Get parsers for all unique file extensions
    const uniqueExtensions = [...new Set(supportedFiles.map(f => f.extension))];
    const parsers = await languageParser.getParsers(uniqueExtensions);

    // Parse files concurrently for better performance
    const parseResults = await Promise.all(
      supportedFiles.map(async (file): Promise<ParseResult> => ({
        relativePath: path.relative(resolvedPath, file.path),
        definitions: await parseFile(file, parsers)
      }))
    );

    // Format results
    const definitionsFound = parseResults.filter(r => r.definitions != null);
    const unparsedFiles = parseResults
      .filter(r => r.definitions == null)
      .map(r => r.relativePath)
      .sort();

    let result = "";

    // Add found definitions
    for (const { relativePath, definitions } of definitionsFound) {
      result += `${relativePath}\n${definitions}\n`;
    }

    // Add unparsed files section if any
    if (unparsedFiles.length > 0) {
      result += [
        "# Unparsed Files",
        "",
        ...unparsedFiles
      ].join("\n");
    }

    return result || "No source code definitions found.";

  }
  catch (error) {
    console.error("Error parsing source code:", error);
    return "An error occurred while parsing the source code.";
  }
}
