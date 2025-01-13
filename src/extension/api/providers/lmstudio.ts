import type { ChatHistoryLike, LLMSpecificModel, ModelDescriptor } from "@lmstudio/sdk";

import type { MessageParamWithTokenCount } from "@shared/api";

import type { Model, ProviderResponseStream } from "../types";
import type { APIModelProviderConfig } from "../api.provider";

import { LMStudioClient } from "@lmstudio/sdk";

import { extractMessageFromThrow } from "@shared/utils/exception";

import { APIModelProvider } from "../api.provider";
import { LMStudioTransformer } from "../transformers/lmstudio";


export const lmStudioSaneDefaultModel: Omit<Model, "id"> = {
  outputLimit: 32_768,
  contextWindow: 128_000,
  supportsImages: true,
  supportsPromptCache: false
};

interface LMStudioModelProviderConfig extends APIModelProviderConfig {}

export class LMStudioProvider extends APIModelProvider<LMStudioModelProviderConfig> {

  protected override client: LMStudioClient | null = null;
  private model: LLMSpecificModel | null = null;

  constructor({ apiBaseURL, ...options }: Record<string, unknown>) {
    super("LMStudio", {
      ...options,
      apiBaseURL: (apiBaseURL as string) || "http://localhost:8080"
    });
  }

  protected async onDispose(): Promise<void> {
    if (this.client != null && this.model != null) {
      try {
        await this.client.llm.unload(this.config.modelId);
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

  async *createResponseStream(systemPrompt: string, messages: MessageParamWithTokenCount[]): ProviderResponseStream {

    if (this.client != null || this.model != null) {
      throw new Error(`Recline <${this.name}> Not initialized`);
    }

    // Convert messages to LMStudio format
    // TODO: Formatter
    const lmStudioMessages: ChatHistoryLike = {
      messages: [
        { role: "system", content: systemPrompt },
        ...LMStudioTransformer.toExternalMessages(messages)
      ]
    };

    // Create prediction stream
    const prediction = this.model.respond(lmStudioMessages, {
      temperature: 0.3, // TODO: configurable
      maxPredictedTokens: lmStudioSaneDefaultModel.outputLimit // TODO: Replace
    });

    // Stream text chunks
    for await (const { content } of prediction) {
      if (content != null && content.length > 0) {
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
        inputTokenCount: stats.promptTokensCount ?? 0,
        outputTokenCount: stats.predictedTokensCount ?? 0
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
      id: identifier,
      outputLimit: lmStudioSaneDefaultModel.outputLimit, // TODO: Replace
      contextWindow: await model.getContextLength(),
      supportsImages: false,
      supportsPromptCache: false
    };
  }
}
