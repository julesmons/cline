import type { ReclineMessage } from "@extension/core/tasks/types";

import type { ModelProviderConfig } from "../provider";
import type { Model, ProviderResponseStream } from "../types";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { StatefulModelProvider } from "../stateful.provider";


interface GeminiModelProviderConfig extends ModelProviderConfig {
  apiKey: string;
}

export class GeminiModelProvider extends StatefulModelProvider<GeminiModelProviderConfig> {

  protected client: GoogleGenerativeAI | null = null;

  constructor(options: Record<string, unknown>) {
    super("Gemini", options);
  }

  protected async onDispose(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  protected async onInitialize(): Promise<void> {
    this.client = new GoogleGenerativeAI(this.config.apiKey);
  }

  createResponseStream(systemPrompt: string, messages: ReclineMessage[]): ProviderResponseStream {
    throw new Error("Method not implemented.");
  }

  async getAllModels(): Promise<Model[]> {

    return [
      {
        id: "gemini-2.0-flash-thinking-exp-1219",
        outputLimit: 8192,
        contextWindow: 32_767,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        millionInputTokensPrice: 0, // Because the model is in BETA, it's currently free to use.
        millionOutputTokensPrice: 0, // Because the model is in BETA, it's currently free to use.
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "gemini-2.0-flash-exp",
        outputLimit: 8192,
        contextWindow: 1_048_576,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        millionInputTokensPrice: 0, // Because the model is in BETA, it's currently free to use.
        millionOutputTokensPrice: 0, // Because the model is in BETA, it's currently free to use.
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "gemini-exp-1206",
        outputLimit: 8192,
        contextWindow: 2_097_152,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        millionInputTokensPrice: 0, // Because the model is in BETA, it's currently free to use.
        millionOutputTokensPrice: 0, // Because the model is in BETA, it's currently free to use.
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "gemini-1.5-flash-002",
        outputLimit: 8192,
        contextWindow: 1_048_576,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        millionInputTokensPrice: 0, // TODO: THIS MODEL IS NOT IN BETA, DETERMINE PRICE
        millionOutputTokensPrice: 0, // TODO: THIS MODEL IS NOT IN BETA, DETERMINE PRICE
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "gemini-1.5-flash-exp-0827",
        outputLimit: 8192,
        contextWindow: 1_048_576,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        millionInputTokensPrice: 0, // Because the model is in BETA, it's currently free to use.
        millionOutputTokensPrice: 0, // Because the model is in BETA, it's currently free to use.
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "gemini-1.5-flash-8b-exp-0827",
        outputLimit: 8192,
        contextWindow: 1_048_576,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        millionInputTokensPrice: 0, // Because the model is in BETA, it's currently free to use.
        millionOutputTokensPrice: 0, // Because the model is in BETA, it's currently free to use.
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "gemini-1.5-pro-002",
        outputLimit: 8192,
        contextWindow: 2_097_152,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        millionInputTokensPrice: 0, // TODO: THIS MODEL IS NOT IN BETA, DETERMINE PRICE
        millionOutputTokensPrice: 0, // TODO: THIS MODEL IS NOT IN BETA, DETERMINE PRICE
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "gemini-1.5-pro-exp-0827",
        outputLimit: 8192,
        contextWindow: 2_097_152,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        millionInputTokensPrice: 0, // Because the model is in BETA, it's currently free to use.
        millionOutputTokensPrice: 0, // Because the model is in BETA, it's currently free to use.
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      }
    ];
  }

  async getCurrentModel(): Promise<Model> {
    throw new Error("Method not implemented.");
  }
}
