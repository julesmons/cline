import type { MessageParamWithTokenCount } from "@shared/api";

import type { Model } from "@extension/api";

import { SlidingContextWindowStrategy } from "../strategy";


interface TruncationInfo {
  lastTruncationPoint: number;
  truncationCounter: number;
  stickinessFactor: number;
}

const defaultTruncationInfo: TruncationInfo = {
  lastTruncationPoint: 0,
  truncationCounter: 0,
  stickinessFactor: 5
};

export class StickySlidingWindowStrategy extends SlidingContextWindowStrategy {
  private truncationInfo: TruncationInfo;

  constructor() {
    super();
    this.truncationInfo = { ...defaultTruncationInfo };
  }

  private groupMessages(messages: MessageParamWithTokenCount[]): { totalTokens: number; messages: MessageParamWithTokenCount[] }[] {
    if (!Array.isArray(messages) || messages.length <= 1) {
      return [];
    }

    const groups: { totalTokens: number; messages: MessageParamWithTokenCount[] }[] = [];
    const currentGroup: { totalTokens: number; messages: MessageParamWithTokenCount[] } = { totalTokens: 0, messages: [] };

    // Start from index 1 since we always keep the first message
    for (let i = 1; i < messages.length; i++) {
      const msg = messages[i];
      currentGroup.totalTokens += msg.tokenCount ?? 0;

      if (msg.role === "user") {
        if (currentGroup.messages.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup.messages = [msg];
      }
      else {
        currentGroup.messages.push(msg);
      }
    }

    if (currentGroup.messages.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  applyTruncation(
    model: Model,
    messages: MessageParamWithTokenCount[]
  ): MessageParamWithTokenCount[] {
    try {
      if (((model?.info?.contextWindow) == null) || !Array.isArray(messages) || messages.length === 0) {
        return messages;
      }

      const firstTaskMessage = messages[0];
      const availableContext = model.info.contextWindow - (firstTaskMessage.tokenCount ?? 0);

      if (this.truncationInfo.truncationCounter >= this.truncationInfo.stickinessFactor) {
        this.truncationInfo.truncationCounter = 0;

        const groupedMessages = this.groupMessages(messages);
        if (groupedMessages.length === 0) {
          return messages;
        }

        const selectedGroups: MessageParamWithTokenCount[][] = [];
        let currentTokenCount = 0;

        // Process from end to start
        for (let i = groupedMessages.length - 1; i >= 0; i--) {
          const group = groupedMessages[i];

          if (currentTokenCount + group.totalTokens <= availableContext) {
            selectedGroups.unshift(group.messages);
            currentTokenCount += group.totalTokens;
          }
          else {
            break;
          }
        }

        return [firstTaskMessage, ...selectedGroups.flat()];
      }

      this.truncationInfo.truncationCounter++;
      return messages;

    }
    catch (error) {
      console.error("Error in sticky truncation strategy:", error);
      return messages;
    }
  }

  reset(): void {
    this.truncationInfo = { ...defaultTruncationInfo };
  }
}
