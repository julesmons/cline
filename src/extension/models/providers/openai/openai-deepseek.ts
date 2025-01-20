import type { Model } from "@extension/models/types";

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

    // Should be removed after the discount ends. This is a temporary solution.
    const isDiscounted: boolean = Date.now() < 1_650_000_000_000; // 2025-02-08 16:00 (UTC)

    return [
      {
        id: "deepseek-chat",
        outputLimit: 8192,
        contextWindow: 64_000,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        millionInputTokensPrice: isDiscounted ? 0.014 : 0.07,
        millionOutputTokensPrice: isDiscounted ? 0.28 : 1.10,
        millionCacheReadTokensPrice: 0.14,
        millionCacheWriteTokensPrice: 0.014,
        imageFee: 0,
        requestFee: 0
      }
    ];
  }
}
