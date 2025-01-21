import * as os from "node:os";
import * as path from "node:path";

import * as vscode from "vscode";


// TODO: This static class is not desirable. Should be refactored to some sort of service.
// Created to ease the refactor (incremental steps)
export abstract class ReclineWorkspace {

  static reclineRulesFilename: string = ".reclinerules";

  static workspaceRoot: string = (
    vscode.workspace.workspaceFolders
      ?.map(folder => folder.uri.fsPath)
      .at(0) ?? path.join(os.homedir(), "Desktop")
  );

  static reclineRulesPath: string = `${ReclineWorkspace.workspaceRoot}/${ReclineWorkspace.reclineRulesFilename}`;
}
