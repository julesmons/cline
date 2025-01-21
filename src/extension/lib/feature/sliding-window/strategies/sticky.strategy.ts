import type { Model } from "@extension/core/models/types";
import type { ReclineMessage } from "@extension/core/tasks/types";

import { SlidingContextWindowStrategy } from "../strategy";


interface TruncationInfo {
  lastTruncationPoint: number;
  truncationCounter: number;
  stickinessFactor: number;
}

const defaultTruncationInfo: TruncationInfo = {
  lastTruncationPoint: 0,
  truncationCounter: 0,
  stickinessFactor: 5 // Re-evaluate truncation after every 5 new messages
};

export class StickySlidingWindowStrategy extends SlidingContextWindowStrategy {
  private truncationInfo: TruncationInfo;

  constructor() {
    super();
    this.truncationInfo = { ...defaultTruncationInfo };
  }

  // Corrected groupMessages function
  private groupMessages(messages: ReclineMessage[]): ReclineMessage[][] {
    const groups: ReclineMessage[][] = [];
    let currentGroup: ReclineMessage[] = [];

    // Start from index 1 to skip the first task message (already handled in apply)
    for (let i = 1; i < messages.length; i++) {
      const msg = messages[i];

      if (msg.role === "user" || msg.role === "system") {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [msg];
      }
      else {
        currentGroup.push(msg);
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  apply(model: Model, messages: ReclineMessage[]): ReclineMessage[] {
    // Always keep the first Task message
    const firstTaskMessage = messages[0];
    const availableContext
      = model.contextWindow - (firstTaskMessage.contentTokenCount ?? 0);

    // Check if we need to re-evaluate truncation
    if (
      this.truncationInfo.truncationCounter
      >= this.truncationInfo.stickinessFactor
    ) {
      // Reset the counter
      this.truncationInfo.truncationCounter = 0;

      // 1. Group messages into pairs (or groups including system messages)
      const groupedMessages = this.groupMessages(messages);

      // 2. Calculate token counts for each group
      const groupTokenCounts = groupedMessages.map(group =>
        group.reduce((acc, msg) => acc + (msg.contentTokenCount ?? 0), 0)
      );

      // 3. Smartly select groups from the end, respecting the last truncation point
      const selectedGroups: ReclineMessage[][] = [];
      let currentTokenCount = 0;
      for (let j = groupedMessages.length - 1; j >= 0; j--) {
        // Respect the last truncation point if it exists
        if (
          this.truncationInfo.lastTruncationPoint > 0
          && messages.indexOf(groupedMessages[j][0])
          <= this.truncationInfo.lastTruncationPoint
        ) {
          break;
        }

        const potentialTokenCount = currentTokenCount + groupTokenCounts[j];
        if (potentialTokenCount <= availableContext) {
          selectedGroups.unshift(groupedMessages[j]);
          currentTokenCount = potentialTokenCount;
        }
        else if (selectedGroups.length === 0) {
          // Edge case: even the last group alone exceeds the context
          continue;
        }
        else {
          break;
        }
      }

      // 4. Update the last truncation point
      if (selectedGroups.length < groupedMessages.length) {
        const lastIncludedGroup = selectedGroups[0];
        this.truncationInfo.lastTruncationPoint
          = messages.indexOf(lastIncludedGroup[0]) - 1;
        // Ensure the truncation point doesn't fall on an assistant message
        while (
          this.truncationInfo.lastTruncationPoint > 0
          && messages[this.truncationInfo.lastTruncationPoint].role === "assistant"
        ) {
          this.truncationInfo.lastTruncationPoint--;
        }
      }
      else {
        this.truncationInfo.lastTruncationPoint = 0;
      }

      // 5. Flatten and return
      const truncatedMessages = [firstTaskMessage, ...selectedGroups.flat()];
      return truncatedMessages;
    }
    else {
      // No truncation needed, increment counter and return all messages
      this.truncationInfo.truncationCounter++;
      return messages;
    }
  }

  public dispose(): void {
    this.truncationInfo = { ...defaultTruncationInfo };
  }
}
