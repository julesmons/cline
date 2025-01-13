import type { Model } from "@extension/api/types";

import type { OpenAICompatibleModelProviderConfig } from "./openai-compatible";

import { OpenAICompatibleModelProvider } from "./openai-compatible";


export interface OpenAILMStudioModelProviderConfig extends OpenAICompatibleModelProviderConfig {}

export class OpenAILMStudioModelProvider extends OpenAICompatibleModelProvider<OpenAILMStudioModelProviderConfig> {

  constructor({ apiBaseURL, ...options }: Record<string, unknown>) {
    super("OpenAI LMStudio", {
      ...options,
      apiBaseURL: (apiBaseURL as string) || "http://localhost:1234/v1"
    });
  }

  async getAllModels(): Promise<Model[]> {
    // TODO: Add info for a set of the most popular models.
    // Sane defaults are currently always used, but might differ wildly from what a model can actually deliver.
    return [];
  }
}
