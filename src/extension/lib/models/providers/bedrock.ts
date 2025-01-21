import type { ReclineMessage } from "@extension/core/tasks/types";

import type { ModelProviderConfig } from "../provider";
import type { Model, ProviderResponseStream } from "../types";

import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";

import { StatefulModelProvider } from "../stateful.provider";


interface BedrockModelProviderConfig extends ModelProviderConfig {
  awsAccessKey: string;
  awsSecretKey: string;
  awsSessionToken: string;
  awsRegion: string;
}

export class BedrockModelProvider extends StatefulModelProvider<BedrockModelProviderConfig> {

  protected client: AnthropicBedrock | null = null;

  constructor(options: Record<string, unknown>) {
    super("Bedrock", options);
  }

  protected async onDispose(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  protected async onInitialize(): Promise<void> {
    this.client = new AnthropicBedrock({
      awsAccessKey: this.config.awsAccessKey,
      awsSecretKey: this.config.awsSecretKey,
      awsSessionToken: this.config.awsSessionToken,
      awsRegion: this.config.awsRegion
    });
  }

  createResponseStream(systemPrompt: string, messages: ReclineMessage[]): ProviderResponseStream {
    throw new Error("Method not implemented.");
  }

  async getAllModels(): Promise<Model[]> {
    return [
      {
        id: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        outputLimit: 8192,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: true,
        millionInputTokensPrice: 3.0,
        millionOutputTokensPrice: 15.0,
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "anthropic.claude-3-5-sonnet-20240620-v1:0",
        outputLimit: 8192,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: true,
        millionInputTokensPrice: 3.0,
        millionOutputTokensPrice: 15.0,
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "anthropic.claude-3-5-haiku-20241022-v1:0",
        outputLimit: 8192,
        contextWindow: 200_000,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: true,
        millionInputTokensPrice: 1.0,
        millionOutputTokensPrice: 5.0,
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "anthropic.claude-3-opus-20240229-v1:0",
        outputLimit: 4096,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: true,
        millionInputTokensPrice: 15.0,
        millionOutputTokensPrice: 75.0,
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "anthropic.claude-3-haiku-20240307-v1:0",
        outputLimit: 4096,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: true,
        millionInputTokensPrice: 0.25,
        millionOutputTokensPrice: 1.25,
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
