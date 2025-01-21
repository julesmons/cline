import type { MessageParamWithTokenCount } from "@shared/api";

import type { Model } from "@extension/api";


export abstract class SlidingContextWindowStrategy {
  abstract applyTruncation(model: Model, messages: MessageParamWithTokenCount[]): MessageParamWithTokenCount[];
  abstract reset(): void;
}
