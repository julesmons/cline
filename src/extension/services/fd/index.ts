import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as process from "node:process";
import * as readline from "node:readline";
import * as childProcess from "node:child_process";

import { workspaceRoot } from "@extension/constants";
import { arePathsEqual } from "@common/utils/filesystem/path";


// TODO: Bundler does not pick this up correctly yet.
// import { fdPath } from "@reexport/fd-prebuilt";
// const fdPath = join(extensionPath, "bin", "fd.exe");
const fdPath = "fd";


const DEFAULT_LIMIT = 1000;

interface FdOptions {
  recursive?: boolean;
  relative?: boolean;

  limit?: number;
  filePattern?: string;
}

async function execFd(args: string[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    // Ensure fd runs from project root for proper gitignore handling
    const fdProcess = childProcess.spawn(fdPath, args, {
      cwd: workspaceRoot ?? process.cwd()
    });

    const rl = readline.createInterface({
      input: fdProcess.stdout,
      crlfDelay: Infinity
    });

    const results: string[] = [];
    let lineCount = 0;

    rl.on("line", (line: string) => {
      const limitIndex = args.indexOf("-l");
      const limitArg = limitIndex !== -1 && args[limitIndex + 1] ? args[limitIndex + 1] : null;
      const limit = limitArg != null && limitArg.length > 0 ? Number.parseInt(limitArg, 10) : DEFAULT_LIMIT;

      if (lineCount < limit && line && line.length > 0) {
        results.push(line);
        lineCount++;
      }
      else {
        rl.close();
        fdProcess.kill();
      }
    });

    let errorOutput = "";
    fdProcess.stderr.on("data", (data: unknown) => {
      if (typeof data === "string" || typeof data === "object") {
        errorOutput += String(data);
      }
    });

    rl.on("close", () => {
      if (errorOutput && errorOutput.length > 0) {
        reject(new Error(`fd process error: ${errorOutput}`));
      }
      else {
        resolve(results);
      }
    });

    fdProcess.on("error", (error: Error) => {
      reject(new Error(`fd process error: ${error.message}`));
    });
  });
}

export async function listFiles(
  dirPath: string,
  options: FdOptions = {}
): Promise<[string[], boolean]> {
  const {
    recursive = false,
    relative = false,
    limit = DEFAULT_LIMIT,
    filePattern
  } = options;

  const absolutePath = path.resolve(dirPath);

  // Protect root and home directories
  const root = process.platform === "win32" ? path.parse(absolutePath).root : "/";
  const isRoot = arePathsEqual(absolutePath, root);
  if (isRoot) {
    return [[root], false];
  }
  const homeDir = os.homedir();
  const isHomeDir = arePathsEqual(absolutePath, homeDir);
  if (isHomeDir) {
    return [[homeDir], false];
  }

  // Base fd arguments
  const args = [
    "--search-path",
    dirPath,
    "--hidden",
    "--exclude",
    ".git" // .gitignore is respected by default, but .git is usually not listed in .gitignore
  ];

  args.push(relative ? "" : "--absolute-path");

  // Handle recursive vs non-recursive search
  if (!recursive) {
    args.push("--max-depth", "1");
  }

  // Add file pattern if specified
  const hasValidPattern = filePattern != null && filePattern.length > 0;
  if (hasValidPattern) {
    args.push("--glob", filePattern);
  }

  // Add limit
  const limitStr = String(limit);
  if (limitStr && limitStr.length > 0) {
    args.push("--max-results", limitStr);
  }

  try {
    // FD automatically respects .gitignore and .fdignore
    const results = await execFd(args);

    // Mark directories with trailing / (fd doesn't do this by default)
    const markedResults = await Promise.all(results.map(async (filePath) => {
      try {
        const stat = await fs.promises.stat(filePath);
        return stat.isDirectory() ? `${filePath}/` : filePath;
      }
      catch {
        return filePath;
      }
    }));

    return [markedResults, markedResults.length >= limit];
  }
  catch (error) {
    console.error("fd error:", error);
    return [[], false];
  }
}
