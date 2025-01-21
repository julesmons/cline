import * as path from "node:path";

import * as vscode from "vscode";
import { isEqual } from "es-toolkit";


type FileDiagnostics = [vscode.Uri, vscode.Diagnostic[]][];

export class DiagnosticsManager {

  /**
   * Gets a human-readable label for diagnostic severity.
   */
  private getSeverityLabel(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return "Error";
      case vscode.DiagnosticSeverity.Warning:
        return "Warning";
      case vscode.DiagnosticSeverity.Information:
        return "Information";
      case vscode.DiagnosticSeverity.Hint:
        return "Hint";
      default:
        return "Diagnostic";
    }
  }

  /**
   * Formats diagnostics into a human-readable string.
   */
  public formatDiagnostics(
    diagnostics: FileDiagnostics,
    severities: vscode.DiagnosticSeverity[],
    cwd: string
  ): string {
    let result = "";

    for (const [uri, fileDiagnostics] of diagnostics) {
      const problems = fileDiagnostics.filter(d => severities.includes(d.severity));
      if (problems.length > 0) {
        result += `\n\n${path.relative(cwd, uri.fsPath)}`;

        for (const diagnostic of problems) {
          const label = this.getSeverityLabel(diagnostic.severity);
          const line = diagnostic.range.start.line + 1;
          const source = diagnostic.source != null ? `${diagnostic.source} ` : "";
          result += `\n- [${source}${label}] Line ${line}: ${diagnostic.message}`;
        }
      }
    }

    return result.trim();
  }

  /**
   * Gets new diagnostics by comparing old and new states.
   */
  public getNewDiagnostics(oldDiagnostics: FileDiagnostics, newDiagnostics: FileDiagnostics): FileDiagnostics {
    const newProblems: FileDiagnostics = [];
    const oldMap = new Map(oldDiagnostics);

    for (const [uri, newDiags] of newDiagnostics) {
      const oldDiags = oldMap.get(uri) || [];
      const newProblemsForUri = newDiags.filter(
        newDiag => !oldDiags.some(oldDiag => isEqual(oldDiag, newDiag))
      );

      if (newProblemsForUri.length > 0) {
        newProblems.push([uri, newProblemsForUri]);
      }
    }

    return newProblems;
  }
}
