import type { Anthropic } from "@anthropic-ai/sdk";

import type { ApiHandlerOptions, ModelInfo } from "@shared/api";

import type { ModelProvider } from "..";
import type { ApiStream } from "../transform/stream";

import OpenAI from "openai";

import { openAiModelInfoSaneDefaults } from "@shared/api";

import { convertToOpenAiMessages } from "../transform/openai-format";


export class OllamaModelProvider implements ModelProvider {
  private client: OpenAI;
  private options: ApiHandlerOptions;

  constructor(options: ApiHandlerOptions) {
    this.options = options;
    this.client = new OpenAI({
      baseURL: `${this.options.ollamaBaseUrl || "http://127.0.0.1:11434"}/v1`,
      apiKey: "ollama"
    });
  }

  async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
    const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...convertToOpenAiMessages(messages)
    ];

    const model = await this.getModel();
    const stream = await this.client.chat.completions.create({
      model: model.id,
      messages: openAiMessages,
      temperature: 0,
      stream: true
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        yield {
          type: "text",
          text: delta.content
        };
      }
    }
  }

  async getModel(): Promise<{ id: string; info: ModelInfo }> {
    return {
      id: this.options.ollamaModelId || "",
      info: openAiModelInfoSaneDefaults
    };
  }
}
