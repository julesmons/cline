import type { ZodSchema } from "zod";
import type { GenerativeModel } from "@google/generative-ai";

import type { MessageParamWithTokenCount } from "@shared/api";

import type { Model, ProviderResponseStream } from "../types";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { GeminiTransformer } from "../transformers/gemini";
import { APIModelProvider, type APIModelProviderConfig } from "../api.provider";


interface GeminiModelProviderConfig extends APIModelProviderConfig {}

export class GeminiModelProvider extends APIModelProvider<GeminiModelProviderConfig> {
  protected override client: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;

  constructor(config: Record<string, unknown>) {
    super("Gemini", config);
  }

  protected async onDispose(): Promise<void> {
    this.client = null;
    this.model = null;
  }

  protected async onInitialize(): Promise<void> {
    this.client = new GoogleGenerativeAI(this.config.apiKey);

    const modelName = this.config.modelId ?? "gemini-pro";
    this.model = this.client.getGenerativeModel({ model: modelName });
  }

  async *createResponseStream(
    systemPrompt: string,
    messages: MessageParamWithTokenCount[]
  ): ProviderResponseStream {
    if (!this.model) {
      throw new Error("Gemini model not initialized");
    }

    try {
      // Convert messages to Gemini format
      const allMessages = GeminiTransformer.toExternalMessages([
        { role: "user", content: systemPrompt, tokenCount: 0 },
        ...messages
      ]);

      // Initialize chat with history (all but last message)
      const chat = this.model.startChat({
        history: allMessages.slice(0, -1).map(msg => ({
          role: msg.role,
          parts: msg.parts.filter((part): part is { text: string } =>
            "text" in part && typeof part.text === "string"
          )
        }))
      });

      // Send the last message
      const lastMessage = allMessages[allMessages.length - 1];
      const lastParts = lastMessage.parts.map((part) => {
        if ("text" in part && part.text != null && part.text.length > 0) {
          return part.text;
        }
        return ""; // Skip non-text parts for now
      }).filter(text => text.length > 0);

      const response = await chat.sendMessageStream(lastParts);

      // Process chunks and yield text content
      let totalChars = 0;
      for await (const chunk of response.stream) {
        const text = chunk.text();
        if (text) {
          totalChars += text.length;
          yield {
            type: "text",
            content: text
          };
        }
      }

      // Estimate token count (rough approximation)
      const estimatedInputTokens = Math.ceil(systemPrompt.length / 4)
        + messages.reduce((acc, msg) => {
          if (typeof msg.content === "string") {
            return acc + Math.ceil(msg.content.length / 4);
          }
          return acc + Math.ceil(
            msg.content.reduce((sum, part) =>
              sum + (part.type === "text" ? part.text.length : 0), 0) / 4
          );
        }, 0);

      yield {
        type: "usage",
        inputTokenCount: estimatedInputTokens,
        outputTokenCount: Math.ceil(totalChars / 4) // Rough estimate of output tokens
      };

    }
    catch (error) {
      console.error("Gemini API error:", error);
      throw error;
    }
  }

  async getAllModels(): Promise<Model[]> {
    // Gemini's available models
    return [
      {
        id: "gemini-pro",
        contextWindow: 32_768,
        outputLimit: 2048,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: true
      },
      {
        id: "gemini-pro-vision",
        contextWindow: 32_768,
        outputLimit: 2048,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: true
      }
    ];
  }

  getConfigSchema(): ZodSchema<GeminiModelProviderConfig> {
    return super.getConfigSchema();
  }

  async getCurrentModel(): Promise<Model> {
    if (!this.model) {
      throw new Error("Gemini model not initialized");
    }

    const modelId = this.config.modelId ?? "gemini-pro";
    const models = await this.getAllModels();
    const currentModel = models.find(m => m.id === modelId);

    if (!currentModel) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    return currentModel;
  }
}
