import * as vscode from "vscode";


const fadedOverlayDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255, 255, 0, 0.1)",
  opacity: "0.4",
  isWholeLine: true
});

const activeLineDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255, 255, 0, 0.3)",
  opacity: "1",
  isWholeLine: true,
  border: "1px solid rgba(255, 255, 0, 0.5)"
});

type DecorationType = "fadedOverlay" | "activeLine";

export class DecorationController {
  private decorationType: DecorationType;
  private editor: vscode.TextEditor;
  private pendingRanges: vscode.Range[] = [];
  private rangeCache = new Map<string, vscode.Range>();
  private ranges: vscode.Range[] = [];
  private updateTimeout: NodeJS.Timeout | null = null;
  private visibleRanges: readonly vscode.Range[] = [];

  constructor(decorationType: DecorationType, editor: vscode.TextEditor) {
    this.decorationType = decorationType;
    this.editor = editor;
    this.visibleRanges = editor.visibleRanges;

    // Listen for scroll events to update visible ranges
    this.setupVisibleRangeTracking();
  }

  private flushUpdates() {
    if (this.pendingRanges.length > 0) {
      this.ranges = [...this.pendingRanges];
      this.pendingRanges = [];
      this.editor.setDecorations(this.getDecoration(), this.ranges);
    }
  }

  private getCachedRange(startLine: number, endLine: number): vscode.Range {
    const key = `${startLine}-${endLine}`;
    let range = this.rangeCache.get(key);
    if (!range) {
      range = new vscode.Range(
        new vscode.Position(startLine, 0),
        new vscode.Position(endLine, Number.MAX_SAFE_INTEGER)
      );
      this.rangeCache.set(key, range);
    }
    return range;
  }

  private getDecoration() {
    switch (this.decorationType) {
      case "fadedOverlay":
        return fadedOverlayDecorationType;
      case "activeLine":
        return activeLineDecorationType;
    }
  }

  private isRangeVisible(range: vscode.Range): boolean {
    return this.visibleRanges.some(visibleRange =>
      range.end.line >= visibleRange.start.line
      && range.start.line <= visibleRange.end.line
    );
  }

  private scheduleUpdate() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      this.flushUpdates();
      this.updateTimeout = null;
    }, 16); // ~1 frame @ 60fps
  }

  private setupVisibleRangeTracking() {
    const updateVisibleRanges = () => {
      this.visibleRanges = this.editor.visibleRanges;
    };

    // Update visible ranges when editor scrolls
    vscode.window.onDidChangeTextEditorVisibleRanges(
      (e) => {
        if (e.textEditor === this.editor) {
          updateVisibleRanges();
        }
      }
    );
  }

  addLines(startIndex: number, numLines: number) {
    // Guard against invalid inputs
    if (startIndex < 0 || numLines <= 0) {
      return;
    }

    const lastRange = this.pendingRanges[this.pendingRanges.length - 1] || this.ranges[this.ranges.length - 1];
    if (lastRange && lastRange.end.line === startIndex - 1) {
      const newRange = lastRange.with(undefined, lastRange.end.translate(numLines));
      this.pendingRanges = [...this.ranges.slice(0, -1), newRange];
    }
    else {
      const endLine = startIndex + numLines - 1;
      const range = this.getCachedRange(startIndex, endLine);
      this.pendingRanges.push(range);
    }

    this.scheduleUpdate();
  }

  clear() {
    this.ranges = [];
    this.pendingRanges = [];
    this.rangeCache.clear();
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
    this.editor.setDecorations(this.getDecoration(), []);
  }

  setActiveLine(line: number) {
    const range = this.getCachedRange(line, line);
    if (!this.isRangeVisible(range)) {
      return;
    }

    this.pendingRanges = [range];
    this.scheduleUpdate();
  }

  updateOverlayAfterLine(line: number, totalLines: number) {
    // Only update if the range would be visible
    const range = this.getCachedRange(line + 1, totalLines - 1);
    if (!this.isRangeVisible(range)) {
      return;
    }

    // Remove any existing ranges that start at or after the current line
    this.pendingRanges = this.ranges.filter(r => r.end.line < line);

    // Add a new range for all lines after the current line
    if (line < totalLines - 1) {
      this.pendingRanges.push(range);
    }

    this.scheduleUpdate();
  }
}
