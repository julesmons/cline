import type { MessageParamWithTokenCount } from "@shared/api";

import type { Model } from "@extension/api";

import { SlidingContextWindowStrategy } from "../strategy";


export class FallbackSlidingWindowStrategy extends SlidingContextWindowStrategy {
  applyTruncation(
    model: Model,
    messages: MessageParamWithTokenCount[]
  ): MessageParamWithTokenCount[] {
    try {
      // Validate inputs
      if (!Array.isArray(messages) || messages.length === 0) {
        return messages;
      }

      if (model?.info?.contextWindow == null) {
        return messages;
      }

      // Always preserve the first message (contains project context)
      if (messages.length <= 1) {
        return messages;
      }

      // Calculate how many message pairs to remove (half of remaining messages)
      const messagesToRemove = Math.floor((messages.length - 1) / 4) * 2;

      if (messagesToRemove === 0) {
        return messages;
      }

      // Keep first message and remove calculated number of messages after it
      // Ensure we end on a user message removal to maintain assistant-user alternation
      const endIndex = Math.min(1 + messagesToRemove, messages.length - 1);
      const adjustedEndIndex = messages[endIndex]?.role === "assistant"
        ? endIndex - 1
        : endIndex;

      // Construct final array with first message + remaining messages after truncation
      const truncatedMessages = [
        messages[0],
        ...messages.slice(adjustedEndIndex + 1)
      ];

      return truncatedMessages;
    }
    catch (error) {
      console.error("Error in fallback truncation strategy:", error);
      return messages;
    }
  }

  reset(): void {
    // No-op
  }
}
