import type {
  ApiHandlerOptions,
  MessageParamWithTokenCount,
  ModelInfo
} from "@shared/api";

import type { ModelProvider } from "@extension/api";
import type { ApiStream } from "@extension/api/transform/stream";

import { createHash } from "node:crypto";

import * as vscode from "vscode";
import { stringifyVsCodeLmModelSelector } from "@shared/vsCodeSelectorUtils";

import { calculateApiCost } from "@extension/utils/cost";
import { convertToVsCodeLmMessages } from "@extension/api/transform/vscode-lm-format";

import { roughlyEstimateTokenCount } from "../utils";


export class VSCodeLmModelProvider implements ModelProvider {

  private client: vscode.LanguageModelChat | null;
  private configurationWatcher: vscode.Disposable | null;
  private currentRequestCancellation: vscode.CancellationTokenSource | null;
  private options: ApiHandlerOptions;

  // This is a non-persistent cache that stores the token count.
  // It's used to avoid redundant token counting for the same text content.
  // The cache is active during the lifecycle of the provider instance. (usually the lifetime of a task-run)
  private temporaryTokenCache: Map<string, number>;

  constructor(options: ApiHandlerOptions) {
    this.options = options;
    this.client = null;
    this.configurationWatcher = null;
    this.currentRequestCancellation = null;
    this.temporaryTokenCache = new Map();

    this.configurationWatcher = vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
      if (event.affectsConfiguration("lm")) {
        this.releaseCurrentCancellation();
        this.client = null;
      }
    });
  }

  private async calculateInputTokens(systemPrompt: string, messages: MessageParamWithTokenCount[]): Promise<number> {

    let totalTokens: number = 0;

    // Calculate the token count for the system prompt.
    const systemPromptCacheKey: string = this.getTemporaryTokenCacheKey(systemPrompt);
    if (!this.temporaryTokenCache.has(systemPromptCacheKey)) {
      const tokenCount: number = await this.countTokens(systemPrompt);
      this.temporaryTokenCache.set(systemPromptCacheKey, tokenCount);
      totalTokens += tokenCount;
    }
    else {
      totalTokens += this.temporaryTokenCache.get(systemPromptCacheKey) ?? 0;
    }

    // Calculate the token count for the messages.
    for (const msg of messages) {

      // 1. If the tokenCount is stored in the message, use it.
      if (msg.tokenCount != null) {
        totalTokens += msg.tokenCount;
        continue;
      }

      // Extract the text content from the message.
      const messageContent = Array.isArray(msg.content)
        ? msg.content
          .filter(block => block.type === "text")
          .map(block => block.text)
          .join("\n")
        : msg.content;

      // 2. If the tokenCount is somehow not stored in the message, query the temporary cache as fallback.
      const messageCacheKey: string = this.getTemporaryTokenCacheKey(messageContent);
      if (this.temporaryTokenCache.has(messageCacheKey)) {
        totalTokens += this.temporaryTokenCache.get(messageCacheKey) ?? 0;
        continue;
      }

      console.warn("Recline <Language Model API>: Token count not found in the message or the temporary cache during input tokenization.");

      // 3. If the tokenCount is not stored in the message and the temporary cache, calculate it. (This is the most expensive case.)
      const tokenCount: number = await this.countTokens(messageContent);
      this.temporaryTokenCache.set(messageCacheKey, tokenCount);
      totalTokens += tokenCount;
    }

    return totalTokens;
  }

  private async countTokens(text: string): Promise<number> {
    if ((!this.client || !this.currentRequestCancellation?.token) || this.currentRequestCancellation.token.isCancellationRequested) {
      console.warn("Recline <Language Model API>: Token counting is not possible without an active client or cancellation token. Using rough estimation instead.");
      return roughlyEstimateTokenCount(text);
    }

    try {
      return await this.client.countTokens(text, this.currentRequestCancellation.token);
    }
    catch (error) {
      if (error instanceof vscode.CancellationError) {
        throw error;
      }

      console.warn("Recline <Language Model API>: Token counting failed:", error);
      return roughlyEstimateTokenCount(text);
    }
  }

  private async getClient(): Promise<vscode.LanguageModelChat> {
    if (!this.options.vsCodeLmModelSelector) {
      throw new Error("Recline <Language Model API>: The 'vsCodeLmModelSelector' option is required for the 'vscode-lm' provider.");
    }

    if (!this.client) {
      this.client = await this.selectBestModel(this.options.vsCodeLmModelSelector);
    }

    return this.client;
  }

  private async *processStreamChunks(response: vscode.LanguageModelChatResponse, contentBuilder: string[]): ApiStream {
    const stream = response.stream;

    for await (const chunk of stream) {
      if (this.currentRequestCancellation?.token.isCancellationRequested) {
        break;
      }

      if (chunk instanceof vscode.LanguageModelTextPart && chunk.value) {
        contentBuilder.push(chunk.value);
        yield { type: "text", text: chunk.value };
      }
      else if (chunk instanceof vscode.LanguageModelToolCallPart) {
        try {
          // Validate tool call parameters
          if (!chunk.name || typeof chunk.name !== "string") {
            console.warn("Recline <Language Model API>: Invalid tool name received:", chunk.name);
            continue;
          }

          if (!chunk.callId || typeof chunk.callId !== "string") {
            console.warn("Recline <Language Model API>: Invalid tool callId received:", chunk.callId);
            continue;
          }

          // Ensure input is a valid object
          if (chunk.input == null || typeof chunk.input !== "object") {
            console.warn("Recline <Language Model API>: Invalid tool input received:", chunk.input);
            continue;
          }

          // Convert tool calls to text format with proper error handling
          const toolCall = {
            type: "tool_call",
            name: chunk.name,
            arguments: chunk.input,
            callId: chunk.callId
          };

          const toolCallText = JSON.stringify(toolCall);
          contentBuilder.push(toolCallText);

          // Log tool call for debugging
          console.debug("Recline <Language Model API>: Processing tool call:", {
            name: chunk.name,
            callId: chunk.callId,
            inputSize: JSON.stringify(chunk.input).length
          });

          yield {
            type: "text",
            text: toolCallText
          };
        }
        catch (error) {
          console.error("Recline <Language Model API>: Failed to process tool call:", error);
          // Continue processing other chunks even if one fails
          continue;
        }
      }
    }
  }

  private releaseCurrentCancellation(): void {
    if (!this.currentRequestCancellation) {
      return;
    }

    this.currentRequestCancellation.cancel();
    this.currentRequestCancellation.dispose();
    this.currentRequestCancellation = null;
  }

  private async selectBestModel(selector: vscode.LanguageModelChatSelector): Promise<vscode.LanguageModelChat> {
    const models = await vscode.lm.selectChatModels(selector);
    if (models.length === 0) {
      throw new Error("Recline <Language Model API>: No models found matching the specified selector.");
    }

    return models.reduce((best, current) => current.maxInputTokens > best.maxInputTokens ? current : best, models[0]);
  }

  async *createMessage(systemPrompt: string, messages: MessageParamWithTokenCount[]): ApiStream {

    console.log("Recline <Language Model API>: Creating api stream");

    // Ensure the previous request is cancelled before starting a new one.
    this.releaseCurrentCancellation();

    const client = await this.getClient();
    const model = await this.getModel();
    this.currentRequestCancellation = new vscode.CancellationTokenSource();

    // Start counting the input tokens parallel to the request. (Promise is created, but not awaited)
    const totalInputTokensPromise: Promise<number> = this.calculateInputTokens(systemPrompt, messages);

    const vsCodeLmMessages = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      ...convertToVsCodeLmMessages(messages)
    ];

    const contentBuilder: string[] = [];

    try {
      console.log("Recline <Language Model API>: Sending request to vscode-lm");
      const response = await client.sendRequest(
        vsCodeLmMessages,
        { justification: `${client.name} from ${client.vendor} will be used by Recline. Click 'Allow' to proceed.` },
        this.currentRequestCancellation.token
      );

      console.log("Recline <Language Model API>: Processing received response stream");
      const streamGenerator = this.processStreamChunks(response, contentBuilder);
      yield * streamGenerator;

      if (!this.currentRequestCancellation?.token.isCancellationRequested) {
        console.log("Recline <Language Model API>: Calculating usage and cost");

        // Ensure all token counting is completed before calculating the cost and yielding usage.
        const [inputTokens, outputTokens] = await Promise.all([
          totalInputTokensPromise,
          this.countTokens(contentBuilder.join(""))
        ]);

        yield {
          type: "usage",
          inputTokens,
          outputTokens,
          totalCost: calculateApiCost(
            model.info,
            inputTokens,
            outputTokens
          )
        };
      }
    }
    catch (error: unknown) {
      if (error instanceof vscode.CancellationError) {
        throw new TypeError("Recline <Language Model API>: Request cancelled by user");
      }

      if (error instanceof Error) {
        console.error("Recline <Language Model API>: Stream error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });

        // Return original error if it's already an Error instance
        throw error;
      }
      else if (typeof error === "object" && error !== null) {
        // Handle error-like objects
        const errorDetails = JSON.stringify(error, null, 2);
        console.error("Recline <Language Model API>: Stream error object:", errorDetails);
        throw new Error(`Recline <Language Model API>: Response stream error: ${errorDetails}`);
      }
      else {
        // Fallback for unknown error types
        const errorMessage = String(error);
        console.error("Recline <Language Model API>: Unknown stream error:", errorMessage);
        throw new Error(`Recline <Language Model API>: Response stream error: ${errorMessage}`);
      }
    }
    finally {
      this.releaseCurrentCancellation();
    }

    console.log("Recline <Language Model API>: API streaming finished.");
  }

  async dispose(): Promise<void> {
    this.releaseCurrentCancellation();

    if (this.configurationWatcher) {
      this.configurationWatcher.dispose();
      this.configurationWatcher = null;
    }

    this.client = null;
    this.temporaryTokenCache.clear();
  }

  async getModel(): Promise<{ id: string; info: ModelInfo }> {
    const client = await this.getClient();
    return {
      id: stringifyVsCodeLmModelSelector(client),
      info: {
        maxTokens: client.maxInputTokens,
        contextWindow: client.maxInputTokens,
        supportsImages: false,
        supportsPromptCache: false,
        inputPrice: 0,
        outputPrice: 0
      }
    };
  }

  getTemporaryTokenCacheKey(value: string): string {
    // TODO: Consider using a more efficient/performant hash function.
    return createHash("sha1").update(value).digest("base64");
  }
}
