import type { MessageParamWithTokenCount } from "@shared/api";

import type { Model } from "@extension/api";

import type { SlidingContextWindowStrategy } from "./strategy";

import { StickySlidingWindowStrategy } from "./strategies/sticky.strategy";
import { FallbackSlidingWindowStrategy } from "./strategies/fallback.strategy";


const MAX_MESSAGE_HISTORY = 1000; // Add reasonable limit

export class SlidingContextWindowManager {
  private activeStrategy: SlidingContextWindowStrategy | null = null;
  private fallbackStrategy: FallbackSlidingWindowStrategy;
  private stickyStrategy: StickySlidingWindowStrategy;

  constructor() {
    this.stickyStrategy = new StickySlidingWindowStrategy();
    this.fallbackStrategy = new FallbackSlidingWindowStrategy();
  }

  private getStrategy(
    model: Model,
    messages: MessageParamWithTokenCount[]
  ): SlidingContextWindowStrategy {
    try {
      const requiredStrategy = this.selectStrategy(messages);

      if (this.activeStrategy !== requiredStrategy) {
        if (this.activeStrategy) {
          this.activeStrategy.reset();
        }
        this.activeStrategy = requiredStrategy;
      }

      return this.activeStrategy;
    }
    catch (error) {
      console.error("Error getting strategy:", error);
      return this.fallbackStrategy;
    }
  }

  private selectStrategy(messages: MessageParamWithTokenCount[]): SlidingContextWindowStrategy {
    if (!Array.isArray(messages)) {
      return this.fallbackStrategy;
    }

    return messages.some(m => m.tokenCount !== 0 && m.tokenCount !== undefined)
      ? this.stickyStrategy
      : this.fallbackStrategy;
  }

  private validateMessages(messages: MessageParamWithTokenCount[]): MessageParamWithTokenCount[] {
    if (!Array.isArray(messages)) {
      console.warn("Invalid messages array received");
      return [];
    }

    if (messages.length > MAX_MESSAGE_HISTORY) {
      console.warn(`Messages exceeding limit (${MAX_MESSAGE_HISTORY}), truncating...`);
      return messages.slice(-MAX_MESSAGE_HISTORY);
    }

    return messages;
  }

  public applyTruncation(
    model: Model,
    messages: MessageParamWithTokenCount[]
  ): MessageParamWithTokenCount[] {
    try {
      if ((model?.info?.contextWindow) == null) {
        return messages;
      }

      const validatedMessages = this.validateMessages(messages);
      if (validatedMessages.length === 0) {
        return messages;
      }

      const strategy = this.getStrategy(model, validatedMessages);
      return strategy.applyTruncation(model, validatedMessages);
    }
    catch (error) {
      console.error("Error in sliding window truncation:", error);
      return messages;
    }
  }

  public reset(): void {
    this.activeStrategy?.reset();
    this.stickyStrategy.reset();
    this.fallbackStrategy.reset();
    this.activeStrategy = null;
  }
}
