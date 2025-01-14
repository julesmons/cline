import type OpenAI from "openai";
import type { Anthropic } from "@anthropic-ai/sdk";

import type { MessageParamWithTokenCount } from "@shared/api";

import { Transformer } from "../transformer";


export abstract class OpenAICompatibleTransformer extends Transformer<OpenAI.Chat.ChatCompletionMessageParam> {
  public static toExternalMessages(internalMessages: MessageParamWithTokenCount[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return internalMessages.map((msg) => {
      if (typeof msg.content === "string") {
        return {
          role: msg.role,
          content: msg.content
        };
      }

      // Handle content blocks
      const { textBlocks, imageBlocks, toolUseBlocks, toolResultBlocks } = msg.content.reduce<{
        textBlocks: Anthropic.TextBlockParam[];
        imageBlocks: Anthropic.ImageBlockParam[];
        toolUseBlocks: Anthropic.ToolUseBlockParam[];
        toolResultBlocks: Anthropic.ToolResultBlockParam[];
      }>(
        (acc, part) => {
          switch (part.type) {
            case "text":
              acc.textBlocks.push(part);
              break;
            case "image":
              acc.imageBlocks.push(part);
              break;
            case "tool_use":
              acc.toolUseBlocks.push(part);
              break;
            case "tool_result":
              acc.toolResultBlocks.push(part);
              break;
            // Document type is converted to text
            case "document":
              acc.textBlocks.push({
                type: "text",
                text: `[Document: ${part.source?.media_type || "unknown"}]`
              });
              break;
          }
          return acc;
        },
        {
          textBlocks: [],
          imageBlocks: [],
          toolUseBlocks: [],
          toolResultBlocks: []
        }
      );

      if (msg.role === "assistant") {
        // Assistant message with potential tool calls
        const content = textBlocks.map(block => block.text).join("\n");
        const tool_calls = toolUseBlocks.map(block => ({
          id: block.id,
          type: "function" as const,
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input)
          }
        }));

        return {
          role: "assistant",
          content: content || undefined,
          tool_calls: tool_calls.length > 0 ? tool_calls : undefined
        };
      }
      else {
        // User message with potential images and tool results
        if (toolResultBlocks.length > 0) {
          // Handle tool results first
          const messages: OpenAI.Chat.ChatCompletionMessageParam[] = toolResultBlocks.map(block => ({
            role: "tool",
            tool_call_id: block.tool_use_id,
            content: typeof block.content === "string"
              ? block.content
              : (
                block.content
                  ?.map(
                    part => part.type === "text" ? part.text : "[Image]"
                  )
                  .join("\n") ?? ""
              )
          }));

          // Then the user message with remaining content
          const content = textBlocks.length > 0 || imageBlocks.length > 0
            ? textBlocks.map(block => block.text).join("\n")
            : undefined;

          messages.push({
            role: "user",
            content: content ?? ""
          });

          return messages[0]; // Return first message, the provider will handle the rest
        }

        // Regular user message with potential images
        if (imageBlocks.length > 0) {
          return {
            role: "user",
            content: [
              ...textBlocks.map(block => ({ type: "text" as const, text: block.text })),
              ...imageBlocks.map(block => ({
                type: "image_url" as const,
                image_url: {
                  url: `data:${block.source.media_type};base64,${block.source.data}`
                }
              }))
            ]
          };
        }

        // Simple text-only user message
        return {
          role: "user",
          content: textBlocks.map(block => block.text).join("\n")
        };
      }
    });
  }

  public static toInternalMessages(externalMessages: OpenAI.Chat.ChatCompletionMessageParam[]): MessageParamWithTokenCount[] {
    return externalMessages.map((msg): MessageParamWithTokenCount => {
      const role = msg.role === "assistant" ? "assistant" as const : "user" as const;

      // Handle array content (images, etc)
      if (Array.isArray(msg.content)) {
        const content: Anthropic.ContentBlockParam[] = msg.content.map((part) => {
          if (part.type === "text") {
            return { type: "text", text: part.text };
          }
          else if (part.type === "image_url") {
            // Extract base64 data from data URL
            const match = part.image_url.url.match(/^data:(.+?);base64,(.+)$/);
            // Ensure media_type is one of the allowed types
            let media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/png";
            const detectedType = match?.[1];
            if (detectedType === "image/jpeg" || detectedType === "image/png"
              || detectedType === "image/gif" || detectedType === "image/webp") {
              media_type = detectedType;
            }
            return {
              type: "image",
              source: {
                type: "base64",
                media_type,
                data: match?.[2] ?? ""
              }
            };
          }
          return { type: "text", text: JSON.stringify(part) };
        });

        return { role, content, tokenCount: 0 };
      }

      // Handle tool calls for assistant messages
      if (msg.role === "assistant" && msg.tool_calls != null && msg.tool_calls.length > 0) {
        const content: Anthropic.ContentBlockParam[] = [];

        if (msg.content != null && msg.content.length > 0) {
          content.push({ type: "text", text: msg.content });
        }

        content.push(
          ...msg.tool_calls.map((tool): Anthropic.ToolUseBlockParam => ({
            type: "tool_use",
            id: tool.id,
            name: tool.function.name,
            input: JSON.parse(tool.function.arguments || "{}")
          }))
        );

        return { role, content, tokenCount: 0 };
      }

      // Handle simple string content
      return {
        role,
        content: msg.content ?? "",
        tokenCount: 0
      };
    });
  }
}
