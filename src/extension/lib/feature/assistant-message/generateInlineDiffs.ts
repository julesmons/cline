export function generateInlineDiffs(
  originalContent: string,
  finalContent: string,
  userEdits: string | undefined,
  autoFormattingEdits: string | undefined
): string {
  if ((autoFormattingEdits == null || autoFormattingEdits.length === 0) && (userEdits == null || userEdits.length === 0)) {
    return finalContent; // No changes to highlight
  }

  const finalContentLines = finalContent.split("\n");
  const changeMap: { [lineNumber: number]: string } = {};


  // 1. Process User Edits (if any)
  if (userEdits != null && userEdits.length > 0) {
    const userEditDiffs = userEdits.split("@@");
    for (const userEdit of userEditDiffs) {
      if (userEdit.trim() === "")
        continue;

      const match = userEdit.match(/-(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        const _lineNumBefore = Number.parseInt(match[1], 10);
        const lineNumAfter = Number.parseInt(match[2], 10);

        const diffLines = userEdit.split("\n");
        let currentLine = lineNumAfter;

        for (const diffLine of diffLines) {
          if (diffLine.startsWith("+")) {
            // User added a line
            changeMap[currentLine]
              = `${changeMap[currentLine] ? `${changeMap[currentLine]} and ` : ""
              }User added this line`;
            currentLine++;
          }
          else if (diffLine.startsWith("-")) {
            // User removed a line (no need to track, as we only show the final content)
          }
          else if (!diffLine.startsWith("@@")) {
            // Context line, just increment the line number
            currentLine++;
          }
        }
      }
    }
  }

  // 2. Process Auto-Formatting Edits (Character-Level Analysis)
  if (autoFormattingEdits) {
    const autoFormatDiffs = autoFormattingEdits.split("@@");
    for (const autoFormatEdit of autoFormatDiffs) {
      if (autoFormatEdit.trim() === "")
        continue;

      const match = autoFormatEdit.match(/-(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        const _lineNumBefore = Number.parseInt(match[1], 10);
        const lineNumAfter = Number.parseInt(match[2], 10);

        const diffLines = autoFormatEdit.split("\n");
        let currentLine = lineNumAfter;

        for (const diffLine of diffLines) {
          if (diffLine.startsWith("+")) {
            const addedLine = diffLine.substring(1); // Remove the "+"
            const originalLine = finalContentLines[currentLine - 1]; // Get the corresponding line from finalContent

            if (originalLine) {
              const changeDetails = analyzeChanges(originalLine, addedLine);
              if (changeDetails.length > 0) {
                changeMap[currentLine] = changeDetails
                  .map(change => `Auto-formatted: ${change}`)
                  .join(" and ");
              }
            }
            currentLine++;
          }
          else if (diffLine.startsWith("-")) {
            // Removed line (no need to track)
          }
          else if (!diffLine.startsWith("@@")) {
            // Context line, just increment the line number
            currentLine++;
          }
        }
      }
    }
  }

  // 3. Annotate Lines (Same as before)
  const annotatedLines = finalContentLines.map((line, index) => {
    const lineNumber = index + 1;
    const changeDescription = changeMap[lineNumber];
    if (changeDescription) {
      return `${line} // ${changeDescription}`;
    }
    else {
      return line;
    }
  });

  return annotatedLines.join("\n");
}

// Character-Level Comparison and Categorization
function analyzeChanges(originalLine: string, addedLine: string): string[] {
  const changes: string[] = [];
  let diffStart = -1;
  // 1. Find the first differing character
  for (let i = 0; i < Math.min(originalLine.length, addedLine.length); i++) {
    if (originalLine[i] !== addedLine[i]) {
      diffStart = i;
      break;
    }
  }

  if (diffStart === -1) {
    // Lines are identical up to the length of the shorter line
    if (originalLine.length > addedLine.length) {
      changes.push("Removed trailing characters");
    }
    else if (addedLine.length > originalLine.length) {
      changes.push("Added trailing characters");
    }
    return changes; // Return early as we don't need further analysis
  }
  else {
    // We found a difference, so let's examine it closer
    // 2. Examine the changes from diffStart till end of each line
    const originalLineDiff = originalLine.substring(diffStart);
    const addedLineDiff = addedLine.substring(diffStart);

    // 3. Check for indentation changes
    const originalIndent = originalLine.match(/^(\s*)/)?.[1] || "";
    const addedIndent = addedLine.match(/^(\s*)/)?.[1] || "";
    if (originalIndent !== addedIndent) {
      if (addedIndent.length > originalIndent.length) {
        changes.push("Increased indentation");
      }
      else {
        changes.push("Decreased indentation");
      }
    }

    // 4. Check for in-line whitespace changes
    const originalNonIndent = originalLineDiff.trim();
    const addedNonIndent = addedLineDiff.trim();
    if (originalNonIndent === addedNonIndent) {
      // This suggests that only whitespace has changed within the line
      if (originalLineDiff.replace(/\s+/g, "") === addedLineDiff.replace(/\s+/g, "")) {
        changes.push("Changed in-line whitespace");
      }
    }

    // 5. Check for content changes
    if (originalLineDiff.replace(/\s+/g, "") !== addedLineDiff.replace(/\s+/g, "")) {
      // Non-whitespace characters have changed
      changes.push("Content changed");
    }
  }

  return changes;
}
