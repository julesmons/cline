import type { Anthropic } from "@anthropic-ai/sdk";
import type { Content, Part } from "@google/generative-ai";

import type { MessageParamWithTokenCount } from "@shared/api";

import { Transformer } from "../transformer";


export abstract class GeminiTransformer extends Transformer<Content> {
  private static convertContentToGeminiParts(content: string | Anthropic.ContentBlockParam[]): Part[] {
    if (typeof content === "string") {
      return [{ text: content }];
    }

    return content.flatMap((block): Part[] => {
      switch (block.type) {
        case "text":
          return [{ text: block.text }];
        case "image":
          if (block.source.type !== "base64") {
            throw new Error("Unsupported image source type");
          }
          return [{
            inlineData: {
              data: block.source.data,
              mimeType: block.source.media_type
            }
          }];
        case "tool_use":
          return [{
            functionCall: {
              name: block.name,
              args: block.input as Record<string, unknown>
            }
          }];
        case "tool_result": {
          const name = block.tool_use_id.split("-")[0];
          if (block.content == null || block.content === "" || block.content === undefined)
            return [];

          if (typeof block.content === "string") {
            return [{
              functionResponse: {
                name,
                response: {
                  name,
                  content: block.content
                }
              }
            }];
          }

          // Handle tool results with potential images
          const textParts = block.content.filter(part => part.type === "text");
          const imageParts = block.content.filter(part => part.type === "image");
          const text = textParts.map(part => part.text).join("\n\n");
          const imageText = imageParts.length > 0 ? "\n\n(See next part for image)" : null;
          const fullText = text + (imageText ?? "");

          const parts: Part[] = [{
            functionResponse: {
              name,
              response: {
                name,
                content: fullText
              }
            }
          }];

          // Add image parts
          parts.push(...imageParts.map(part => ({
            inlineData: {
              data: part.source.data,
              mimeType: part.source.media_type
            }
          })));

          return parts;
        }
        case "document": {
          const mediaType = block.source?.media_type ?? null;
          const displayType = mediaType != null && mediaType.length > 0 ? mediaType : "unknown";
          return [{ text: `[Document: ${displayType}]` }];
        }
        default: {
          // Handle potential future content types
          return [{ text: "[Unsupported content type]" }];
        }
      }
    });
  }

  public static toExternalMessages(internalMessages: MessageParamWithTokenCount[]): Content[] {
    return internalMessages.map((msg): Content => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: GeminiTransformer.convertContentToGeminiParts(msg.content)
    }));
  }

  public static toInternalMessages(externalMessages: Content[]): MessageParamWithTokenCount[] {
    return externalMessages.map((msg): MessageParamWithTokenCount => {
      const role = msg.role === "model" ? "assistant" as const : "user" as const;
      const content: Anthropic.ContentBlockParam[] = [];

      for (const part of msg.parts ?? []) {
        if ("text" in part) {
          const text = part.text ?? "";
          if (text.length > 0) {
            content.push({
              type: "text",
              text
            });
          }
        }
        else if ("inlineData" in part && part.inlineData) {
          // Convert arbitrary mimeType to one of the supported types
          const mimeType = part.inlineData.mimeType || "image/png";
          let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/png";
          if (mimeType === "image/jpeg" || mimeType === "image/png"
            || mimeType === "image/gif" || mimeType === "image/webp") {
            mediaType = mimeType;
          }

          content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: part.inlineData.data ?? ""
            }
          });
        }
        else if ("functionCall" in part && part.functionCall) {
          content.push({
            type: "tool_use",
            id: `${part.functionCall.name ?? "unknown"}-${Date.now()}`,
            name: part.functionCall.name ?? "unknown",
            input: part.functionCall.args as Record<string, unknown> ?? {}
          });
        }
        else if ("functionResponse" in part && part.functionResponse?.response) {
          content.push({
            type: "tool_result",
            tool_use_id: `${part.functionResponse.name ?? "unknown"}-${Date.now()}`,
            content: (part.functionResponse.response as { content?: string }).content ?? ""
          });
        }
      }

      return {
        role,
        content: content.length === 1 && content[0].type === "text"
          ? content[0].text // Use string content for simple text messages
          : content, // Use array content for multimodal/tool messages
        tokenCount: 0 // Token count will be calculated by the provider
      };
    });
  }

  // Helper function to unescape content from Gemini
  public static unescapeContent(content: string): string {
    return content
      .replace(/\\n/g, "\n")
      .replace(/\\'/g, "'")
      .replace(/\\"/g, "\"")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t");
  }
}
