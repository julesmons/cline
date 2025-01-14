import type { Model } from "@extension/api/types";

import type { OpenAICompatibleModelProviderConfig } from "./openai-compatible";

import { AzureOpenAI } from "openai";

import { OpenAICompatibleModelProvider } from "./openai-compatible";


export interface OpenAIAzureModelProviderConfig extends OpenAICompatibleModelProviderConfig {}

export class OpenAIAzureModelProvider extends OpenAICompatibleModelProvider<OpenAIAzureModelProviderConfig> {

  protected override readonly client: AzureOpenAI;

  constructor(options: Record<string, unknown>) {
    super("OpenAI Azure", options);
    this.client = new AzureOpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.apiBaseURL
    });
  }

  // TODO: All of this information was auto-completed by my IDE. This needs to be researched and replaced (but has been left as-is for now to focus on more pressing issues).
  async getAllModels(): Promise<Model[]> {
    return [
      {
        id: "o1",
        outputLimit: 100_000,
        contextWindow: 200_000,
        supportsImages: true, // TODO: ...
        supportsPromptCache: false, // TODO: ...
        supportsComputerUse: false, // TODO: ...
        inputPrice: 0, // TODO: ...
        outputPrice: 0 // TODO: ...
      },
      {
        id: "o1-preview",
        outputLimit: 32_768,
        contextWindow: 128_000,
        supportsImages: true, // TODO: ...
        supportsPromptCache: false, // TODO: ...
        supportsComputerUse: false, // TODO: ...
        inputPrice: 0, // TODO: ...
        outputPrice: 0 // TODO: ...
      },
      {
        id: "o1-mini",
        outputLimit: 65_536,
        contextWindow: 128_000,
        supportsImages: true, // TODO: ...
        supportsPromptCache: false, // TODO: ...
        supportsComputerUse: false, // TODO: ...
        inputPrice: 0, // TODO: ...
        outputPrice: 0 // TODO: ...
      }
    ];
  }
}
