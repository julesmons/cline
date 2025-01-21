import type { ReclineMessage } from "@extension/core/tasks/types";

import type { Model, ProviderResponseStream } from "../types";

import Anthropic from "@anthropic-ai/sdk";

import { APIModelProvider, type APIModelProviderConfig } from "../api.provider";


interface AnthropicModelProviderConfig extends APIModelProviderConfig {}

export class AnthropicModelProvider extends APIModelProvider<AnthropicModelProviderConfig> {

  protected override client: Anthropic | null = null;

  constructor({ apiBaseURL, ...options }: Record<string, unknown>) {
    super("Anthropic", {
      ...options,
      apiBaseURL: (apiBaseURL as string) || "https://api.anthropic.com"
    });
  }

  protected async onDispose(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  protected async onInitialize(): Promise<void> {
    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.apiBaseURL
    });
  }

  createResponseStream(systemPrompt: string, messages: ReclineMessage[]): ProviderResponseStream {
    throw new Error("Method not implemented.");
  }

  async getAllModels(): Promise<Model[]> {
    return [
      {
        id: "claude-3-5-sonnet-20241022",
        outputLimit: 8192,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: true,
        millionInputTokensPrice: 3.0,
        millionOutputTokensPrice: 15.0,
        millionCacheWriteTokensPrice: 3.75,
        millionCacheReadTokensPrice: 0.3,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "claude-3-5-haiku-20241022",
        outputLimit: 8192,
        contextWindow: 200_000,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        millionInputTokensPrice: 1.0,
        millionOutputTokensPrice: 5.0,
        millionCacheWriteTokensPrice: 1.25,
        millionCacheReadTokensPrice: 0.1,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "claude-3-opus-20240229",
        outputLimit: 4096,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        millionInputTokensPrice: 15.0,
        millionOutputTokensPrice: 75.0,
        millionCacheWriteTokensPrice: 18.75,
        millionCacheReadTokensPrice: 1.5,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "claude-3-haiku-20240307",
        outputLimit: 4096,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        millionInputTokensPrice: 0.25,
        millionOutputTokensPrice: 1.25,
        millionCacheWriteTokensPrice: 0.3,
        millionCacheReadTokensPrice: 0.03,
        imageFee: 0,
        requestFee: 0
      }
    ];
  }

  async getCurrentModel(): Promise<Model> {
    throw new Error("Method not implemented.");
  }
}
