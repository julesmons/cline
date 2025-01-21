import type { ReclineMessage } from "@extension/core/tasks/types";

import type { ModelProviderConfig } from "../provider";
import type { Model, ProviderResponseStream } from "../types";

import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";

import { StatefulModelProvider } from "../stateful.provider";


interface VertexModelProviderConfig extends ModelProviderConfig {
  vertexProjectId: string;
  vertexRegion: string;
}

export class VertexModelProvider extends StatefulModelProvider<VertexModelProviderConfig> {

  protected client: AnthropicVertex | null = null;

  constructor(options: Record<string, unknown>) {
    super("Vertex", options);
  }

  protected async onDispose(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  protected async onInitialize(): Promise<void> {
    this.client = new AnthropicVertex({
      projectId: this.config.vertexProjectId,
      region: this.config.vertexRegion
    });
  }

  createResponseStream(systemPrompt: string, messages: ReclineMessage[]): ProviderResponseStream {
    throw new Error("Method not implemented.");
  }

  async getAllModels(): Promise<Model[]> {

    return [
      {
        id: "claude-3-5-sonnet-v2@20241022",
        outputLimit: 8192,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: true,
        millionInputTokensPrice: 3,
        millionOutputTokensPrice: 15,
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "claude-3-5-sonnet@20240620",
        outputLimit: 8192,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: true,
        millionInputTokensPrice: 3,
        millionOutputTokensPrice: 15,
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "claude-3-5-haiku@20241022",
        outputLimit: 8192,
        contextWindow: 200_000,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        millionInputTokensPrice: 1,
        millionOutputTokensPrice: 5,
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "claude-3-opus@20240229",
        outputLimit: 4096,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        millionInputTokensPrice: 15,
        millionOutputTokensPrice: 75,
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,
        imageFee: 0,
        requestFee: 0
      },
      {
        id: "claude-3-haiku@20240307",
        outputLimit: 4096,
        contextWindow: 200_000,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
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
