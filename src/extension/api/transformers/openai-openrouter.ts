import type { Model } from "../types";

import { openAISaneDefaultModel } from "@extension/api/providers/openai/openai-compatible";

import { OpenAICompatibleTransformer } from "./openai-compatible";


// Because this is an external API that could change at any time, every field is marked as optional.
// This forces other parts of the source-core to explicitly check for the existence of fields before using them.
// This results in more resilient code over-all.
export interface OpenRouterModelInfo {
  id: string;
  name?: string;
  description?: string;
  top_provider?: {
    max_completion_tokens?: number;
    context_length?: number;
  };
  pricing?: {
    prompt?: number; // Price per input token?
    completion?: number; // Price per output token?
    image?: number; // Additional surcharge for images?
    request?: number; // Additional surcharge per request?
  };
  tools?: string[];
  temperature?: number;
  max_tokens?: number;
}

export abstract class OpenAIOpenRouterTransformer extends OpenAICompatibleTransformer {

  public static toInternalModels(externalModels: OpenRouterModelInfo[]): Model[] {
    return externalModels.map<Model>(model => ({

      id: model.id,
      outputLimit: model.top_provider?.max_completion_tokens ?? openAISaneDefaultModel.outputLimit,
      contextWindow: model.top_provider?.context_length ?? openAISaneDefaultModel.contextWindow,

      supportsImages: openAISaneDefaultModel.supportsImages, // Example output did not include a field for this. Implement properly when available.
      supportsPromptCache: openAISaneDefaultModel.supportsPromptCache, // Example output did not include a field for this. Implement properly when available.
      supportsComputerUse: openAISaneDefaultModel.supportsComputerUse, // Example output did not include a field for this. Implement properly when available.

      inputPrice: model.pricing?.prompt ?? 0,
      outputPrice: model.pricing?.completion ?? 0,
      imageSurcharge: model.pricing?.image ?? 0,
      requestSurcharge: model.pricing?.request ?? 0
    }));
  }
}
