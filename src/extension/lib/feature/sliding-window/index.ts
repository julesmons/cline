import type { Model } from "@extension/core/models/types";

import type { ReclineMessage } from "../../../core/tasks/types";

import type { SlidingContextWindowStrategy } from "./strategy";

import { StickySlidingWindowStrategy } from "./strategies/sticky.strategy";
import { FallbackSlidingWindowStrategy } from "./strategies/fallback.strategy";


export { SlidingContextWindowStrategy as SlidingWindowStrategy } from "./strategy";

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
    messages: ReclineMessage[]
  ): SlidingContextWindowStrategy {
    const requiredStrategy = this.selectStrategy(messages);

    if (this.activeStrategy !== requiredStrategy) {
      this.activeStrategy?.dispose();
      this.activeStrategy = requiredStrategy;
    }

    return this.activeStrategy;
  }

  private selectStrategy(messages: ReclineMessage[]): SlidingContextWindowStrategy {
    return messages.some(m => m.contentTokenCount !== 0 && m.contentTokenCount !== undefined)
      ? this.stickyStrategy
      : this.fallbackStrategy;
  }

  public apply(
    model: Model,
    messages: ReclineMessage[]
  ): ReclineMessage[] {
    const strategy = this.getStrategy(model, messages);
    return strategy.apply(model, messages);
  }

  public dispose(): void {
    this.activeStrategy?.dispose();
    this.stickyStrategy.dispose();
    this.fallbackStrategy.dispose();
    this.activeStrategy = null;
  }
}
