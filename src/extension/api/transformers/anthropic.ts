import type { Anthropic } from "@anthropic-ai/sdk";

import type { MessageParamWithTokenCount } from "@shared/api";

import { Transformer } from "../transformer";


/**
 * Transformer for Anthropic-compatible providers (Anthropic, Vertex, Bedrock)
 * Since these providers use Anthropic's message format natively, this transformer
 * mostly passes through the content, only handling token counts.
 */
export abstract class AnthropicTransformer extends Transformer<Anthropic.Messages.MessageParam> {
  public static toExternalMessages(internalMessages: MessageParamWithTokenCount[]): Anthropic.Messages.MessageParam[] {
    return internalMessages.map((msg): Anthropic.Messages.MessageParam => {
      if (typeof msg.content === "string") {
        return {
          role: msg.role,
          content: msg.content
        };
      }

      return {
        role: msg.role,
        content: msg.content
      };
    });
  }

  public static toInternalMessages(externalMessages: Anthropic.Messages.MessageParam[]): MessageParamWithTokenCount[] {
    return externalMessages.map((msg): MessageParamWithTokenCount => {
      if (typeof msg.content === "string") {
        return {
          role: msg.role,
          content: msg.content,
          tokenCount: 0 // Token count will be calculated by the provider
        };
      }

      return {
        role: msg.role,
        content: msg.content,
        tokenCount: 0
      };
    });
  }
}
