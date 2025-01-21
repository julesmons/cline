import os from "node:os";
import * as path from "node:path";
import * as process from "node:process";


export function toPosixPath(p: string): string {

  // Extended-Length Paths in Windows start with "\\?\" to allow longer paths and bypass usual parsing. If detected, we return the path unmodified to maintain functionality, as altering these paths could break their special syntax.
  const isExtendedLengthPath = p.startsWith("\\\\?\\");

  if (isExtendedLengthPath) {
    return p;
  }

  return p.replace(/\\/g, "/");
}

// Safe path comparison that works across different platforms
export function arePathsEqual(path1?: string, path2?: string): boolean {

  // 1. If both paths are null or empty, they are equal
  if ((path1 == null || path1.length === 0) && (path2 == null || path2.length === 0)) {
    return true;
  }

  // 2. If only one of the paths is null or empty, they are not equal
  if ((path1 == null || path1.length === 0) || (path2 == null || path2.length === 0)) {
    return false;
  }

  // 3. Normalize paths and compare them
  path1 = normalizePath(path1);
  path2 = normalizePath(path2);

  if (process.platform === "win32") {
    return path1.toLowerCase() === path2.toLowerCase();
  }

  return path1 === path2;
}

function normalizePath(p: string): string {
  // normalize resolve ./.. segments, removes duplicate slashes, and standardizes path separators
  let normalized = path.normalize(p);
  // however it doesn't remove trailing slashes
  // remove trailing slash, except for root paths
  if (normalized.length > 1 && (normalized.endsWith("/") || normalized.endsWith("\\"))) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function getReadablePath(cwd: string, relPath?: string): string {

  relPath = relPath ?? "";

  // path.resolve is flexible in that it will resolve relative paths like '../../' to the cwd and even ignore the cwd if the relPath is actually an absolute path
  const absolutePath = path.resolve(cwd, relPath);

  if (arePathsEqual(cwd, path.join(os.homedir(), "Desktop"))) {
    // User opened vscode without a workspace, so cwd is the Desktop. Show the full absolute path to keep the user aware of where files are being created
    return absolutePath.toPosix();
  }

  if (arePathsEqual(path.normalize(absolutePath), path.normalize(cwd))) {
    // show the base name if the path is the same as the cwd
    return path.basename(absolutePath).toPosix();
  }

  // show the relative path to the cwd
  const normalizedRelPath = path.relative(cwd, absolutePath);

  // if the absolute path is still within the cwd, show the relative path
  if (absolutePath.includes(cwd)) {
    // path.relative returns a path with backslashes on Windows, so we convert it to posix
    return normalizedRelPath.toPosix();
  }

  // we are outside the cwd, so show the absolute path (useful for when recline passes in '../../' for example)
  return absolutePath.toPosix();
}
