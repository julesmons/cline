import type { ZodSchema } from "zod";

import type { ReclineMessage } from "@extension/core/tasks/types";

import type { Model, ProviderResponseStream } from "../types";

import { z } from "zod";


export interface ModelProviderConfig {
  modelId: string;
}

export interface ModelProviderCreateResponseStreamOptions {
  temperature?: number;
}

export abstract class ModelProvider<TConfig extends ModelProviderConfig> {

  protected readonly config: z.infer<ReturnType<this["getConfigSchema"]>>;

  protected constructor(public readonly name: string, config: Record<string, unknown>) {

    this.config = this.getConfigSchema().parse(config);
  }

  public async calculateMessagesCost(
    messages: ReclineMessage[],
    messageDirection: "input" | "output",
    totalBatches: number = 1
  ): Promise<number> {

    const model = await this.getCurrentModel();
    const millionTokenPrice: number = messageDirection === "input" ? model.millionInputTokensPrice : model.millionOutputTokensPrice;

    let cost: number = 0;

    for (const message of messages) {

      // If the message has content, calculate the cost of said content.
      if (message.content != null) {
        cost += (message.contentTokenCount ?? 0) * (millionTokenPrice / 1_000_000);
      }

      // Calculate the cost of the message's images. (Example: OpenRouter bills an additional fee for each image sent to their API.)
      if (message.images.length > 0 && model.imageFee != null) {
        cost += model.imageFee * message.images.length;
      }
    }

    // Factor in the request surcharge if it exists. (Example: OpenRouter bills an additional fee for each request sent to their API.)
    if (model.requestFee != null) {
      cost += model.requestFee * totalBatches;
    }

    return cost;
  }

  abstract createResponseStream(
    systemPrompt: string,
    messages: ReclineMessage[],
    options: ModelProviderCreateResponseStreamOptions
  ): ProviderResponseStream;

  abstract getAllModels(): Promise<Model[]>;

  getConfigSchema(): ZodSchema<TConfig> {
    return z.object({
      modelId: z.string().trim().nonempty().optional()
    }) as ZodSchema<TConfig>;
  }

  abstract getCurrentModel(): Promise<Model>;
}
