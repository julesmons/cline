import type { Model } from "@extension/core/models/types";

import type { OpenAICompatibleModelProviderConfig } from "./openai-compatible";

import { OpenAICompatibleModelProvider } from "./openai-compatible";


export interface OpenAIModelProviderConfig extends OpenAICompatibleModelProviderConfig {}

export class OpenAIModelProvider extends OpenAICompatibleModelProvider<OpenAIModelProviderConfig> {

  constructor({ apiBaseURL, ...options }: Record<string, unknown>) {
    super("OpenAI", {
      ...options,
      apiBaseURL: (apiBaseURL as string) || "https://api.openai.com/v1"
    });
  }

  async getAllModels(): Promise<Model[]> {
    return [
      {
        id: "o1-preview",
        outputLimit: 32_768,
        contextWindow: 128_000,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        millionInputTokensPrice: 15,
        millionOutputTokensPrice: 60,
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "o1-mini",
        outputLimit: 65_536,
        contextWindow: 128_000,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        millionInputTokensPrice: 3,
        millionOutputTokensPrice: 12,
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "gpt-4o",
        outputLimit: 4_096,
        contextWindow: 128_000,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        millionInputTokensPrice: 5,
        millionOutputTokensPrice: 15,
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "gpt-4o-mini",
        outputLimit: 16_384,
        contextWindow: 128_000,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        millionInputTokensPrice: 0.15,
        millionOutputTokensPrice: 0.6,
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      }
    ];
  }
}
