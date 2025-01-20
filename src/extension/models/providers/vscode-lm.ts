import type { ZodSchema } from "zod";

import type { ReclineMessage } from "@extension/core/tasks/types";

import type { ModelProviderConfig } from "../provider";
import type { Model, ProviderResponseStream } from "../types";

import { createHash } from "node:crypto";

import { z } from "zod";
import * as vscode from "vscode";

import { extractMessageFromThrow } from "@shared/utils/exception";

import { isClaudeSonnet } from "@extension/utils/model";

import { StatefulModelProvider } from "../stateful.provider";
import { roughlyEstimateTokenCount } from "../utils/tokenCount";
import { VSCodeLMMessageTransformer } from "../transformers/vscode-lm";


const ERROR_PREFIX = "Recline <Language Model API>";

export interface VSCodeLmModelProviderConfig extends ModelProviderConfig {
  vsCodeLmModelSelector?: vscode.LanguageModelChatSelector;
}

export class VSCodeLmModelProvider extends StatefulModelProvider<VSCodeLmModelProviderConfig> {

  private client: vscode.LanguageModelChat | null = null;

  private configurationWatcher: vscode.Disposable | null = null;
  private currentRequestCancellation: vscode.CancellationTokenSource | null = null;
  private temporaryTokenCache: Map<string, number> = new Map();

  constructor(config: Record<string, unknown>) {

    super("VSCode Language Model API", config);

    this.configurationWatcher = vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {

      if (event.affectsConfiguration("lm")) {
        this.releaseCurrentCancellation();
        this.client = null;
      }
    });
  }

  protected async onDispose(): Promise<void> {

    this.releaseCurrentCancellation();

    if (this.configurationWatcher) {
      this.configurationWatcher.dispose();
      this.configurationWatcher = null;
    }

    this.client = null;
    this.temporaryTokenCache.clear();
  }

  protected async onInitialize(): Promise<void> {

    this.client = await this.selectBestModel(
      this.config.vsCodeLmModelSelector != null
        ? this.config.vsCodeLmModelSelector
        : { id: this.config.modelId }
    );

    if (this.client == null) {
      throw new Error(`${ERROR_PREFIX} No model found matching the specified selector.`);
    }
  }


  /**
   * Calculates the total number of tokens in the system prompt and messages.
   * Uses a cache to store system prompt token counts for performance optimization.
   *
   * @param systemPrompt - The system prompt text to include in token calculation
   * @param messages - Array of ModelProviderMessage objects containing message content
   * @returns Promise resolving to the total number of tokens
   *
   * @remarks
   * The VSCode Language Model API's countTokens method is very performance intensive and may count towards rate limits
   * depending on the model used (based on empirical testing).
   * To mitigate this, the token count is stored in either the message object (and thus persistent history) or the temporary cache.
   *
   * The system prompt is cached using a SHA-1 hash as the key to avoid recalculating tokens for frequently used
   * system prompts, as the provided system prompt could differ between requests.
   *
   * Messages themselves should contain the content's token count.
   * When this count cannot be found in the message for whatever reason, the internal token count cache is used to ease the load whilst maintaining accuracy.
   *
   * Note: This internal cache is not persisted and is cleared when the provider is disposed, but remains useful during
   * the provider's lifecycle (usually the active task loop).
   */
  private async calculateInputTokens(systemPrompt: string, messages: ReclineMessage[]): Promise<number> {

    // Initialize the total token count.
    let totalTokens: number = 0;

    // Get a hash of the system prompt to query the cache with.
    const systemPromptHash: string = (
      createHash("sha1")
        .update(systemPrompt)
        .digest("base64")
    );

    // If there is no matching cache entry, calculate the token count and store it in the cache.
    if (!this.temporaryTokenCache.has(systemPromptHash)) {
      const tokenCount: number = await this.countTokens(systemPrompt);
      this.temporaryTokenCache.set(systemPromptHash, tokenCount);
      totalTokens += tokenCount;
    }
    else {
      // Should be defined but a null-coalescing operator is used for additional safety.
      totalTokens += this.temporaryTokenCache.get(systemPromptHash) ?? 0;
    }

    // Iterate over the messages to determine the token count.
    for (const message of messages) {

      // If the message has no content, skip it.
      if (message.content == null) {
        continue;
      }

      // If the message has a token count, use it.
      if (message.contentTokenCount != null) {
        totalTokens += message.contentTokenCount;
        continue;
      }

      // Get a hash of the message content to query the cache with.
      const messageHash: string = (
        createHash("sha1")
          .update(message.content)
          .digest("base64")
      );

      // If there is a matching cache entry, use it.
      if (this.temporaryTokenCache.has(messageHash)) {
        // Should be defined but a null-coalescing operator is used for additional safety.
        totalTokens += this.temporaryTokenCache.get(messageHash) ?? 0;
        continue;
      }

      // If there is no matching cache entry, calculate the token count and store it in the cache.
      const tokenCount: number = await this.countTokens(message.content);
      totalTokens += tokenCount;
    }

    return totalTokens;
  }

  private async countTokens(text: string): Promise<number> {

    // Sanity-check
    if (this.client == null || this.currentRequestCancellation == null) {
      return roughlyEstimateTokenCount(text);
    }

    try {
      return await this.client.countTokens(text, this.currentRequestCancellation.token);
    }
    catch (error) {
      console.warn(`${ERROR_PREFIX} Token counting failed: ${extractMessageFromThrow(error)}`);
      return roughlyEstimateTokenCount(text);
    }
  }

  private initializeNewCancellation(): void {

    if (this.currentRequestCancellation) {
      throw new Error(`${ERROR_PREFIX} A cancellation token is already active. Cancellation tokens may not be overridden to ensure proper cleanup.`);
    }

    this.currentRequestCancellation = new vscode.CancellationTokenSource();
  }

  private async *processStreamChunks(response: vscode.LanguageModelChatResponse, contentBuilder: string[]): ProviderResponseStream {

    // Unknown is used by the VSCode LM API to represent possible future extensions to the API.
    const stream: AsyncIterable<vscode.LanguageModelTextPart | vscode.LanguageModelToolCallPart | unknown> = response.stream;

    // Iterate over the stream chunks.
    for await (const chunk of stream) {

      // If the request was cancelled, stop processing the stream.
      if (this.currentRequestCancellation?.token.isCancellationRequested) {
        break;
      }

      // If the chunk is a text part, push the content to the contentBuilder and yield it.
      if (chunk instanceof vscode.LanguageModelTextPart && chunk.value != null && chunk.value.length > 0) {
        contentBuilder.push(chunk.value);

        yield {
          type: "text",
          content: chunk.value
        };
      }
    }
  }

  private releaseCurrentCancellation(): void {

    // Sanity-check
    if (this.currentRequestCancellation?.token == null) {
      return;
    }

    this.currentRequestCancellation.cancel();
    this.currentRequestCancellation.dispose();
    this.currentRequestCancellation = null;
  }

  private async selectBestModel(selector: vscode.LanguageModelChatSelector): Promise<vscode.LanguageModelChat> {

    // Get all models matching the selector.
    const models: vscode.LanguageModelChat[] = await vscode.lm.selectChatModels(selector);

    // Sanity-check
    if (models.length === 0) {
      throw new Error(`${ERROR_PREFIX} No models found matching the specified selector.`);
    }

    // Return the model with the highest maxInputTokens, which is the most preferable.
    return models.reduce(
      (best: vscode.LanguageModelChat, current: vscode.LanguageModelChat): vscode.LanguageModelChat => (
        (current.maxInputTokens > best.maxInputTokens)
          ? current
          : best
      ),
      models[0]
    );
  }

  async *createResponseStream(systemPrompt: string, messages: ReclineMessage[]): ProviderResponseStream {

    // Sanity-check
    if (this.client == null) {
      throw new Error(`${ERROR_PREFIX} Client not initialized.`);
    }

    // Ensure clean cancellation state
    this.releaseCurrentCancellation();
    this.initializeNewCancellation();

    // Sanity-check
    if (this.currentRequestCancellation?.token == null) {
      throw new Error(`${ERROR_PREFIX} Cancellation token not initialized.`);
    }

    // Start input token counting in parallel
    const inputTokenPromise: Promise<number> = this.calculateInputTokens(systemPrompt, messages);

    // Transform messages
    const vsCodeLmMessages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      ...VSCodeLMMessageTransformer.toExternalMessages(messages)
    ];

    // Initialize content builder
    const contentBuilder: string[] = [];

    // Create response stream
    const response: vscode.LanguageModelChatResponse = await this.client.sendRequest(
      vsCodeLmMessages,
      { justification: `${this.client.name} from ${this.client.vendor} will be used by Recline. Click 'Allow' to proceed.` },
      this.currentRequestCancellation.token
    );

    // Sanity-check
    if (response == null) {
      throw new Error(`${ERROR_PREFIX} Request failed.`);
    }

    // Process stream chunks
    const streamGenerator: ProviderResponseStream = this.processStreamChunks(response, contentBuilder);
    yield * streamGenerator;

    // After streaming completes, handle token counts and usage emission
    if (!this.currentRequestCancellation?.token.isCancellationRequested) {

      // Wait for both token counts in parallel.
      // The input token count has already been started and should be resolved by now.
      // The output token count only has to process one message, so it should be quick.
      const [inputTokenCount, outputTokenCount] = await Promise.all([
        inputTokenPromise,
        this.countTokens(contentBuilder.join(""))
      ]);

      yield {
        type: "usage",
        inputTokenCount,
        outputTokenCount
      };
    }
  }

  async getAllModels(): Promise<Model[]> {

    const lmModels: vscode.LanguageModelChat[] = await vscode.lm.selectChatModels();
    const models: Model[] = [];

    for (const model of lmModels) {
      const id: string | null = VSCodeLMMessageTransformer.stringifySelector(model);

      if (id == null) {
        continue;
      }

      models.push({
        id,

        contextWindow: model.maxInputTokens,
        outputLimit: model.maxInputTokens, // The VSCode LM API does not expose an output limit so the context window is used as an upper bound.

        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: isClaudeSonnet(id),

        // TODO: Cross-reference against a list of known models to determine the correct values.
        millionInputTokensPrice: 0,
        millionOutputTokensPrice: 0,
        millionCacheReadTokensPrice: 0,
        millionCacheWriteTokensPrice: 0,

        imageFee: 0,
        requestFee: 0
      });
    }

    return models;
  }

  override getConfigSchema(): ZodSchema<VSCodeLmModelProviderConfig> {

    return super.getConfigSchema().and(
      z.object({
        vsCodeLmModelSelector: z.union([
          z.object({
            id: z.string().trim().nonempty(),
            version: z.string().trim().nonempty().optional()
          }),
          z.object({
            vendor: z.string().trim().nonempty(),
            family: z.string().trim().nonempty(),
            version: z.string().trim().nonempty().optional()
          })
        ])
      })
    );
  }

  async getCurrentModel(): Promise<Model> {

    // Sanity-check
    if (this.client == null) {
      throw new Error(`${ERROR_PREFIX} Client not initialized.`);
    }

    // Get the stringified selector.
    const id: string | null = VSCodeLMMessageTransformer.stringifySelector(this.client);

    // Sanity-check
    if (id == null || id.length === 0) {
      throw new Error(`${ERROR_PREFIX} Model selector not valid.`);
    }

    // Return the model.
    return {

      id,

      contextWindow: this.client.maxInputTokens,

      // Note: The VSCode LM API does not expose an output limit.
      // To be safe, an 'upper bound' is set to the context window.
      // This assumption should be battle-tested and adjusted if necessary.
      outputLimit: this.client.maxInputTokens,

      supportsImages: false,
      supportsPromptCache: false,
      supportsComputerUse: isClaudeSonnet(id),

      // TODO: Cross-reference against a list of known models to determine the correct values.
      millionInputTokensPrice: 0,
      millionOutputTokensPrice: 0,
      millionCacheReadTokensPrice: 0,
      millionCacheWriteTokensPrice: 0,

      imageFee: 0,
      requestFee: 0
    };
  }
}
