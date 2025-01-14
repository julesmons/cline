import type { Model } from "@extension/api/types";

import type { OpenAICompatibleModelProviderConfig } from "./openai-compatible";

import { OpenAICompatibleModelProvider } from "./openai-compatible";


export interface OpenAIDeepSeekModelProviderConfig extends OpenAICompatibleModelProviderConfig {}

export class OpenAIDeepSeekModelProvider extends OpenAICompatibleModelProvider<OpenAIDeepSeekModelProviderConfig> {

  constructor({ apiBaseURL, ...options }: Record<string, unknown>) {
    super("OpenAI DeepSeek", {
      ...options,
      apiBaseURL: (apiBaseURL as string) || "https://api.deepseek.com"
    });
  }

  async getAllModels(): Promise<Model[]> {
    return [
      {
        id: "deepseek-chat",
        outputLimit: 8_000,
        contextWindow: 64_000,
        supportsImages: false,
        supportsPromptCache: true, // supports context caching, but not in the way anthropic does it (deepseek reports input tokens and reads/writes in the same usage report) FIXME: we need to show users cache stats how deepseek does it
        supportsComputerUse: false,
        inputPrice: 0, // technically there is no input price, it's all either a cache hit or miss (ApiOptions will not show this)
        outputPrice: 0.28,
        cacheWritesPrice: 0.14,
        cacheReadsPrice: 0.014
      }
    ];
  }
}
