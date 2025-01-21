import type { Extension } from "vscode";

import * as vscode from "vscode";


// TODO: This static class is not desirable. Should be refactored to some sort of service.
// Created to ease the refactor (incremental steps)
export abstract class ReclineExtension {

  public static extension: Extension<any> = vscode.extensions.getExtension("julesmons.recline")!;
}
