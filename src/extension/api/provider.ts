import type { ZodSchema } from "zod";
import type { ContentBlockParam, TextBlockParam } from "@anthropic-ai/sdk/resources/index.mjs";

import type { MessageParamWithTokenCount } from "@shared/api";

import type { Model, ProviderResponseStream } from "./types";

import { z } from "zod";
import { partition } from "es-toolkit";


export interface ModelProviderConfig {
  modelId?: string; // Providers could potentially lack model selection capabilities.
}

export abstract class ModelProvider<TConfig extends ModelProviderConfig> {

  protected readonly config: z.infer<ReturnType<this["getConfigSchema"]>>;

  protected constructor(public readonly name: string, config: Record<string, unknown>) {

    this.config = this.getConfigSchema().parse(config);
  }

  private async calculateMessagesCost(
    messages: MessageParamWithTokenCount[],
    priceType: "inputPrice" | "outputPrice",
    contentBlockValuator: (model: Model, block: Exclude<ContentBlockParam, TextBlockParam>) => number,
    totalBatches: number = 1
  ): Promise<number> {
    const model = await this.getCurrentModel();
    let cost: number = 0;

    for (const message of messages) {
      if (typeof message.content === "string") {
        cost += (message.tokenCount ?? 0) * (model[priceType] ?? 0);
      }
      else {
        const [textParts, otherParts] = partition(message.content, part => part.type === "text");

        if (textParts.length > 0) {
          cost += (message.tokenCount ?? 0) * (model[priceType] ?? 0);
        }

        for (const part of otherParts) {
          cost += contentBlockValuator(model, part as Exclude<ContentBlockParam, TextBlockParam>);
        }
      }
    }

    cost += (model.requestSurcharge ?? 0) * totalBatches;
    return cost;
  }

  public async calculateInputCost(
    messages: MessageParamWithTokenCount[],
    totalBatches: number = 1
  ): Promise<number> {
    return this.calculateMessagesCost(
      messages,
      "inputPrice",
      (model: Model, block: Exclude<ContentBlockParam, TextBlockParam>): number => {
        switch (block.type) {
          case "image":
            return model.imageSurcharge ?? 0;
          case "tool_use":
          case "tool_result":
          case "document":
          default:
            return 0;
        }
      },
      totalBatches
    );
  }

  public async calculateOutputCost(
    messages: MessageParamWithTokenCount[],
    totalBatches: number = 1
  ): Promise<number> {
    return this.calculateMessagesCost(
      messages,
      "outputPrice",
      (model: Model, block: Exclude<ContentBlockParam, TextBlockParam>): number => {
        switch (block.type) {
          case "image":
            return model.imageSurcharge ?? 0;
          case "tool_use":
          case "tool_result":
          case "document":
          default:
            return 0;
        }
      },
      totalBatches
    );
  }

  abstract createResponseStream(
    systemPrompt: string,
    messages: MessageParamWithTokenCount[]
  ): ProviderResponseStream;

  abstract getAllModels(): Promise<Model[]>;

  getConfigSchema(): ZodSchema<TConfig> {
    return z.object({
      modelId: z.string().trim().nonempty().optional()
    }) as ZodSchema<TConfig>;
  }

  abstract getCurrentModel(): Promise<Model>;;
}
