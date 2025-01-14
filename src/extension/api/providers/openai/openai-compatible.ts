import type { MessageParamWithTokenCount } from "@shared/api";

import type { Model, ProviderResponseStream } from "@extension/api/types";

import OpenAI from "openai";

import { APIModelProvider, type APIModelProviderConfig } from "@extension/api/api.provider";
import { OpenAICompatibleTransformer } from "@extension/api/transformers/openai-compatible";


export const openAISaneDefaultModel: Omit<Model, "id"> = {
  outputLimit: 32_768,
  contextWindow: 128_000,
  supportsImages: true,
  supportsPromptCache: false
};

export interface OpenAICompatibleModelProviderConfig extends APIModelProviderConfig {}

export abstract class OpenAICompatibleModelProvider<TConfig extends OpenAICompatibleModelProviderConfig> extends APIModelProvider<TConfig> {
  protected override client: OpenAI | null = null;

  constructor(name: string, options: Record<string, unknown>) {
    super(name, options);
  }

  protected async onDispose(): Promise<void> {
    this.client = null;
  }

  protected async onInitialize(): Promise<void> {
    this.client = new OpenAI({
      baseURL: this.config.apiBaseURL,
      apiKey: this.config.apiKey
    });
  }

  async *createResponseStream(systemPrompt: string, messages: MessageParamWithTokenCount[]): ProviderResponseStream {

    const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...OpenAICompatibleTransformer.toExternalMessages(messages)
    ];

    const model = await this.getCurrentModel();
    const stream = await this.client!.chat.completions.create({
      model: model.id,
      messages: openAiMessages,
      temperature: 0,
      stream: true,
      stream_options: {
        include_usage: true
      }
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content != null && delta.content.length > 0) {
        yield {
          type: "text",
          content: delta.content
        };
      }
      if (chunk.usage) {
        yield {
          type: "usage",
          inputTokenCount: chunk.usage.prompt_tokens || 0,
          outputTokenCount: chunk.usage.completion_tokens || 0
        };
      }
    }
  }

  async getCurrentModel(): Promise<Model> {
    const models: Model[] = await this.getAllModels();
    return models.find(model => model.id === this.config.modelId) ?? {
      id: this.config.modelId,
      ...openAISaneDefaultModel
    };
  }
}
