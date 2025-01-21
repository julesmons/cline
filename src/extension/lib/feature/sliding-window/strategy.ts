import type { Model } from "@extension/core/models/types";

import type { ReclineMessage } from "../../../core/tasks/types";


export abstract class SlidingContextWindowStrategy {
  abstract apply(model: Model, messages: ReclineMessage[]): ReclineMessage[];
  abstract dispose(): void;
}
