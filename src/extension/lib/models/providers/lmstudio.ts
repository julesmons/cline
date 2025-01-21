import type { ChatHistoryLike, LLMSpecificModel, ModelDescriptor } from "@lmstudio/sdk";

import type { ReclineMessage } from "@extension/core/tasks/types";

import type { Model, ProviderResponseStream } from "../types";
import type { APIModelProviderConfig } from "../api.provider";
import type { ModelProviderCreateResponseStreamOptions } from "../provider";

import { LMStudioClient } from "@lmstudio/sdk";
import { extractMessageFromThrow } from "src/common/utils/exception";

import { APIModelProvider } from "../api.provider";
import { LMStudioTransformer } from "../transformers/lmstudio";
import { roughlyEstimateTokenCount } from "../utils/tokenCount";


export const lmStudioSaneDefaultModel: Omit<Model, "id"> = {

  outputLimit: 8192,
  contextWindow: 128_000,

  supportsImages: true,
  supportsPromptCache: false,
  supportsComputerUse: false,

  // LMStudio is a local provider that runs on the user's machine, so there are no costs associated with it.
  millionInputTokensPrice: 0,
  millionOutputTokensPrice: 0,
  millionCacheReadTokensPrice: 0,
  millionCacheWriteTokensPrice: 0,
  imageFee: 0,
  requestFee: 0
};

export const lmStudioCommonModels: Record<string, Partial<Model>> = {

};

interface LMStudioModelProviderConfig extends APIModelProviderConfig {}

export class LMStudioProvider extends APIModelProvider<LMStudioModelProviderConfig> {

  protected override client: LMStudioClient | null = null;
  private model: LLMSpecificModel | null = null;

  constructor({ apiBaseURL, ...options }: Record<string, unknown>) {
    super("LMStudio", {
      ...options,
      apiBaseURL: (apiBaseURL as string) || "http://127.0.0.1:8080" // Note: The native LMStudio provider is diffrent from the openai-compatible LMStudio provider which is why port 8080 is used instead of 1234. This is not an error.
    });
  }

  protected async onDispose(): Promise<void> {
    if (this.client != null && this.model != null) {
      try {
        await this.client.llm.unload(
          this.model.identifier
        );
      }
      catch (error: unknown) {
        console.error(`Recline <${this.name}> Failed to unload model: ${extractMessageFromThrow(error)}`);
      }
    }
    this.client = null;
    this.model = null;
  }

  protected async onInitialize(): Promise<void> {
    this.client = new LMStudioClient({
      baseUrl: this.config.apiBaseURL
    });

    this.model = await this.client.llm.load(this.config.modelId, {
      config: {
        gpuOffload: {
          ratio: "max",
          mainGpu: 0,
          tensorSplit: [1, 1, 1] // TODO: These values were auto-completed by AI. This needs to be researched and replaced.
        }
      },

      // @ts-expect-error: The docs mention this option, but it's not in the types. Including anyway as this functionality would be ideal.
      noHup: true,

      onProgress: (progress: number): void => {
        console.log(`Recline <${this.name}> Loading model... ${(progress * 100).toFixed(1)}%`);
      }
    });
  }

  async *createResponseStream(systemPrompt: string, messages: ReclineMessage[], options: ModelProviderCreateResponseStreamOptions): ProviderResponseStream {

    if (this.client == null || this.model == null) {
      throw new Error(`Recline <${this.name}> Not initialized`);
    }

    // Convert messages to LMStudio format
    const lmStudioMessages: ChatHistoryLike = {
      messages: [
        { role: "system", content: [{ type: "text", text: systemPrompt }] },
        ...LMStudioTransformer.toExternalMessages(messages)
      ]
    };

    // Create internal content builder to use as a fallback for token count estimation
    const contentBuilder: string[] = [];

    // Create prediction stream
    const prediction = this.model.respond(lmStudioMessages, {
      temperature: options.temperature ?? 0.3,
      maxPredictedTokens: lmStudioSaneDefaultModel.outputLimit
    });

    // Stream text chunks
    for await (const { content } of prediction) {
      if (content != null && content.length > 0) {

        contentBuilder.push(content);

        yield {
          type: "text",
          content
        };
      }
    }

    // Get final stats and yield usage info
    const { stats } = await prediction;

    if (stats != null) {
      yield {
        type: "usage",
        inputTokenCount: stats.promptTokensCount ?? (
          roughlyEstimateTokenCount(systemPrompt)
          + messages.reduce((count, message) => count + (message.contentTokenCount ?? 0), 0)
        ),
        outputTokenCount: stats.predictedTokensCount ?? (
          roughlyEstimateTokenCount(contentBuilder.join())
        )
      };
    }
  }

  async getAllModels(): Promise<Model[]> {

    if (this.client == null) {
      throw new Error(`Recline <${this.name}> Client not initialized.`);
    }

    // Due to limitations of the LMStudio SDK (still in beta), we can't get a list of all models including all required data.
    // We'll have to get each model's information individually.

    const lmStudioModels: ModelDescriptor[] = await this.client.llm.listLoaded();

    return Promise.all(
      lmStudioModels.map(
        async ({ identifier }: ModelDescriptor): Promise<Model> => this.getModel(identifier)
      )
    );
  }

  async getCurrentModel(): Promise<Model> {

    return this.getModel(this.config.modelId);
  }

  async getModel(identifier: string): Promise<Model> {

    if (this.client == null) {
      throw new Error(`Recline <${this.name}> Client not initialized.`);
    }

    const model: LLMSpecificModel = await this.client.llm.get({ identifier });

    return {

      // Use the default model as a base
      ...lmStudioSaneDefaultModel,

      // If the model is included in the common models, merge it's data
      ...(lmStudioCommonModels[identifier] ?? {}),

      // Merge specific model data
      id: identifier,
      contextWindow: await model.getContextLength()
    };
  }
}
