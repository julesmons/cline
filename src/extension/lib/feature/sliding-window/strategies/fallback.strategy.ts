import type { Model } from "@extension/core/models/types";
import type { ReclineMessage } from "@extension/core/tasks/types";

import { SlidingContextWindowStrategy } from "../strategy";


export class FallbackSlidingWindowStrategy extends SlidingContextWindowStrategy {
  apply(model: Model, messages: ReclineMessage[]): ReclineMessage[] {
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
    const endIndex = 1 + messagesToRemove;
    const adjustedEndIndex
      = messages[endIndex]?.role === "assistant" ? endIndex - 1 : endIndex;

    // Construct final array with first message + remaining messages after truncation
    return [messages[0], ...messages.slice(adjustedEndIndex + 1)];
  }

  dispose(): void {
    // No-op
  }
}
