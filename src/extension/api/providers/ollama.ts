import type { Message } from "ollama";

import type { MessageParamWithTokenCount } from "@shared/api";

import type { Model, ProviderResponseStream } from "../types";
import type { APIModelProviderConfig } from "../api.provider";

import { Ollama } from "ollama";

import { APIModelProvider } from "../api.provider";
import { OllamaTransformer } from "../transformers/ollama";


export const ollamaSaneDefaultModel: Omit<Model, "id"> = {
  outputLimit: 32_768,
  contextWindow: 128_000,
  supportsImages: true,
  supportsPromptCache: false,
  supportsComputerUse: false
};

export interface OllamaModelProviderConfig extends APIModelProviderConfig {}

export class OllamaModelProvider<TConfig extends OllamaModelProviderConfig> extends APIModelProvider<TConfig> {

  protected override client: Ollama | null = null;

  constructor({ apiBaseURL, ...options }: Record<string, unknown>) {
    super("Ollama", {
      ...options,
      apiBaseURL: (apiBaseURL as string) || "https://api.deepseek.com"
    });
  }

  protected async onDispose(): Promise<void> {

    if (this.client == null) {
      return;
    }

    this.client.abort();
    this.client = null;
  }

  protected async onInitialize(): Promise<void> {
    this.client = new Ollama({
      host: this.config.apiBaseURL
    });
  }

  async *createResponseStream(systemPrompt: string, messages: MessageParamWithTokenCount[]): ProviderResponseStream {

    // Sanity-check
    if (this.client == null) {
      throw new Error("Ollama client is not initialized.");
    }

    const ollamaMessages: Message[] = [
      { role: "system", content: systemPrompt },
      ...OllamaTransformer.toExternalMessages(messages)
    ];

    const model = await this.getCurrentModel();
    const stream = await this.client.chat({
      model: model.id,
      messages: ollamaMessages,
      stream: true
    });

    for await (const chunk of stream) {

      if (chunk.message.content != null && chunk.message.content.length > 0) {
        yield {
          type: "text",
          content: chunk.message.content
        };
      }

      if (chunk.message.images != null && chunk.message.images.length > 0) {
        for (const image of chunk.message.images) {
          yield {
            type: "image",
            content: image,
            contentType: "image/*"
          };
        }
      }
    }
  }

  async getAllModels(): Promise<Model[]> {

    // Sanity-check
    if (this.client == null) {
      throw new Error("Ollama client is not initialized.");
    }

    const ollamaModels = await this.client.list();

    return ollamaModels.models.map(modelResponse => ({
      id: modelResponse.name,
      ...ollamaSaneDefaultModel // TODO: Map correctly...
    }));
  }

  async getCurrentModel(): Promise<Model> {

    // Sanity-check
    if (this.client == null) {
      throw new Error("Ollama client is not initialized.");
    }

    const metadata = await this.client.show({
      model: this.config.modelId
    });

    return {
      id: this.config.modelId,
      ...ollamaSaneDefaultModel, // TODO: Map correctly...
      ...metadata.model_info // TODO: Map correctly...
    };
  }
}
