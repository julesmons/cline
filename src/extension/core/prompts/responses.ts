import type { Anthropic } from "@anthropic-ai/sdk";

import * as path from "node:path";

import * as diff from "diff";


const toolUseInstructionsReminder = `# Reminder: Instructions for Tool Use

Tool uses are formatted using XML-style tags. The tool name is enclosed in opening and closing tags, and each parameter is similarly enclosed within its own set of tags. Here's the structure:

<tool_name>
<parameter1_name>value1</parameter1_name>
<parameter2_name>value2</parameter2_name>
...
</tool_name>

For example:

<attempt_completion>
<result>
I have completed the task...
</result>
</attempt_completion>

Always adhere to this format for all tool uses to ensure proper parsing and execution.`;

export const formatResponse = {
  toolDenied: (): string => `The user denied this operation.`,

  toolDeniedWithFeedback: (feedback?: string): string =>
    `The user denied this operation and provided the following feedback:\n<feedback>\n${feedback}\n</feedback>`,

  toolError: (error?: string): string => `The tool execution failed with the following error:\n<error>\n${error}\n</error>`,

  noToolsUsed: (): string =>
    `[ERROR] You did not use a tool in your previous response! Please retry with a tool use.

${toolUseInstructionsReminder}

# Next Steps

If you have completed the user's task, use the attempt_completion tool.
If you require additional information from the user, use the ask_question tool.
Otherwise, if you have not completed the task and do not need additional information, then proceed with the next step of the task.
(This is an automated message, so do not respond to it conversationally.)`,

  tooManyMistakes: (feedback?: string): string =>
    `You seem to be having trouble proceeding. The user has provided the following feedback to help guide you:\n<feedback>\n${feedback}\n</feedback>`,

  missingToolParameterError: (paramName: string): string =>
    `Missing value for required parameter '${paramName}'. Please retry with complete response.\n\n${toolUseInstructionsReminder}`,

  invalidMcpToolArgumentError: (serverName: string, toolName: string): string =>
    `Invalid JSON argument used with ${serverName} for ${toolName}. Please retry with a properly formatted JSON argument.`,

  toolResult: (
    text: string,
    images?: string[]
  ): string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam> => {
    if (images && images.length > 0) {
      const textBlock: Anthropic.TextBlockParam = { type: "text", text };
      const imageBlocks: Anthropic.ImageBlockParam[] = formatImagesIntoBlocks(images);
      // Placing images after text leads to better results
      return [textBlock, ...imageBlocks];
    }
    else {
      return text;
    }
  },

  imageBlocks: (images?: string[]): Anthropic.ImageBlockParam[] => {
    return formatImagesIntoBlocks(images);
  },

  formatFilesList: (workingDir: string, files: string[], didHitLimit: boolean): string => {
    const relativePaths = files
      .map(file => path.relative(workingDir, file).toPosix())
      .filter(path => path !== "");

    const sorted = relativePaths.sort((a, b) => {
      const aParts = a.split("/");
      const bParts = b.split("/");

      // Compare each path segment
      for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        if (aParts[i] !== bParts[i]) {
          return aParts[i].localeCompare(bParts[i], undefined, {
            numeric: true,
            sensitivity: "base"
          });
        }
      }

      // Shorter paths come first
      return aParts.length - bParts.length;
    });

    if (sorted.length === 0) {
      return "No files found.";
    }

    if (didHitLimit) {
      return `${sorted.join("\n")}\n\n(File list truncated. Use list_files on specific subdirectories if you need to explore further.)`;
    }

    return sorted.join("\n");
  },

  createPrettyPatch: (filename = "file", oldStr?: string, newStr?: string): string => {
    const patch = diff.createPatch(filename.toPosix(), oldStr ?? "", newStr ?? "");
    const lines = patch.split("\n");
    const prettyPatchLines = lines.slice(4);
    return prettyPatchLines.join("\n");
  }
};

// to avoid circular dependency
function formatImagesIntoBlocks(images?: string[]): Anthropic.ImageBlockParam[] {
  return images
    ? images.map((dataUrl) => {
      // data:image/png;base64,base64string
      const [rest, base64] = dataUrl.split(",");
      const mimeType = rest.split(":")[1].split(";")[0];
      return {
        type: "image",
        source: { type: "base64", media_type: mimeType, data: base64 }
      } as Anthropic.ImageBlockParam;
    })
    : [];
}
