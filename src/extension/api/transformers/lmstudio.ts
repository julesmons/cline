import type { Anthropic } from "@anthropic-ai/sdk";
import type { ChatMessageData, ChatMessagePartData, ChatMessagePartToolCallRequestData, ChatMessagePartToolCallResultData } from "@lmstudio/sdk";

import type { MessageParamWithTokenCount } from "@shared/api";

import { Transformer } from "../transformer";


export abstract class LMStudioTransformer extends Transformer<ChatMessageData> {
  public static toExternalMessages(internalMessages: MessageParamWithTokenCount[]): ChatMessageData[] {
    return internalMessages.map((msg): ChatMessageData => {
      const role = msg.role === "assistant" ? "assistant" : "user";

      if (typeof msg.content === "string") {
        return {
          role,
          content: [{ type: "text", text: msg.content }]
        };
      }

      const content = msg.content.map((block): ChatMessagePartData => {
        switch (block.type) {
          case "text":
            return {
              type: "text",
              text: block.text
            };
          case "image":
            // Convert image to text description since LMStudio doesn't support direct file handling
            return {
              type: "text",
              text: `[Image: ${block.source?.media_type ?? "unknown"}]`
            };
          case "tool_use": {
            const toolRequest: ChatMessagePartToolCallRequestData = {
              type: "toolCallRequest",
              toolCallRequests: [{
                type: "function",
                id: block.id ?? "",
                function: {
                  name: block.name,
                  arguments: block.input ?? {}
                }
              }]
            };
            return toolRequest;
          }
          case "tool_result": {
            const toolResult: ChatMessagePartToolCallResultData = {
              type: "toolCallResult",
              toolCallId: block.tool_use_id ?? "",
              content: typeof block.content === "string"
                ? block.content
                : block.content?.map(part =>
                  part.type === "text" ? part.text : "[Image]"
                ).join("\n") ?? ""
            };
            return toolResult;
          }
          case "document":
            return {
              type: "text",
              text: `[Document: ${block.source?.media_type ?? "unknown"}]`
            };
          default: {
            // This will catch any future content types we haven't handled
            return {
              type: "text",
              text: "[Unsupported content type]"
            };
          }
        }
      });

      // Filter content based on role since each role only accepts specific content types
      if (role === "assistant") {
        const filteredContent = content.filter(part =>
          part.type === "text" || part.type === "toolCallRequest"
        );

        return {
          role: "assistant",
          content: filteredContent
        };
      }
      else {
        const filteredContent = content.filter(part =>
          part.type === "text"
        );

        return {
          role: "user",
          content: filteredContent
        };
      }
    });
  }

  public static toInternalMessages(externalMessages: ChatMessageData[]): MessageParamWithTokenCount[] {
    return externalMessages.map((msg): MessageParamWithTokenCount => {
      const role = msg.role === "assistant" ? "assistant" as const : "user" as const;

      const content: Anthropic.ContentBlockParam[] = [];

      for (const part of msg.content) {
        switch (part.type) {
          case "text":
            content.push({
              type: "text",
              text: part.text
            });
            break;
          case "toolCallRequest":
            content.push(...part.toolCallRequests.map(tool => ({
              type: "tool_use" as const,
              id: tool.id ?? "",
              name: tool.function.name,
              input: tool.function.arguments ?? {}
            })));
            break;
          case "toolCallResult":
            content.push({
              type: "tool_result" as const,
              tool_use_id: part.toolCallId ?? "",
              content: part.content
            });
            break;
          case "file":
            content.push({
              type: "text",
              text: `[File content]`
            });
            break;
        }
      }

      return {
        role,
        content: content.length === 1 && content[0].type === "text"
          ? content[0].text // Use string content for simple text messages
          : content, // Use array content for multimodal/tool messages
        tokenCount: 0
      };
    });
  }
}
