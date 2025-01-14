import type { Model } from "@extension/api/types";

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
        inputPrice: 15,
        outputPrice: 60
      },
      {
        id: "o1-mini",
        outputLimit: 65_536,
        contextWindow: 128_000,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        inputPrice: 3,
        outputPrice: 12
      },
      {
        id: "gpt-4o",
        outputLimit: 4_096,
        contextWindow: 128_000,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        inputPrice: 5,
        outputPrice: 15
      },
      {
        id: "gpt-4o-mini",
        outputLimit: 16_384,
        contextWindow: 128_000,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        inputPrice: 0.15,
        outputPrice: 0.6
      }
    ];
  }
}
