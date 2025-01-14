import type { Message } from "ollama";
import type { Anthropic } from "@anthropic-ai/sdk";

import type { MessageParamWithTokenCount } from "@shared/api";

import { Transformer } from "../transformer";


export abstract class OllamaTransformer extends Transformer<Message> {
  public static toExternalMessages(internalMessages: MessageParamWithTokenCount[]): Message[] {
    return internalMessages.map((msg) => {
      const role = msg.role === "assistant" ? "assistant" : "user";

      if (typeof msg.content === "string") {
        return {
          role,
          content: msg.content
        };
      }

      const { text, images } = msg.content.reduce<{
        text: string[];
        images: string[];
      }>(
        (acc, part) => {
          switch (part.type) {
            case "text":
              acc.text.push(part.text);
              break;
            case "image":
              if (typeof part.source === "string") {
                acc.images.push(part.source);
              }
              break;
            case "tool_use":
            case "tool_result":
              // Convert tool interactions to text for Ollama
              acc.text.push(`[${part.type === "tool_use" ? "Using tool" : "Tool result"}: ${part.type === "tool_use" ? part.name : part.tool_use_id}]`);
              break;
            case "document":
              // Convert document mentions to text
              acc.text.push(`[Document: ${part.source?.media_type || "unknown"}]`);
              break;
          }
          return acc;
        },
        { text: [], images: [] }
      );

      return {
        role,
        content: text.join("\n"),
        images: images.length > 0 ? images : undefined
      };
    });
  }

  public static toInternalMessages(externalMessages: Message[]): MessageParamWithTokenCount[] {
    return externalMessages.map((msg) => {
      const role = msg.role === "assistant" ? "assistant" as const : "user" as const;
      const content = msg.content || "";
      const images = msg.images || [];

      if (images.length === 0) {
        return {
          role,
          content,
          tokenCount: 0
        };
      }

      const contentBlocks: Anthropic.ContentBlockParam[] = [
        { type: "text", text: content }
      ];

      for (const img of images) {
        contentBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png", // Default to PNG as it's widely supported
            data: typeof img === "string" ? img : ""
          }
        });
      }

      return {
        role,
        content: contentBlocks,
        tokenCount: 0
      };
    });
  }
}
