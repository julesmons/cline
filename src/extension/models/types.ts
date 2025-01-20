export interface Model {

  id: string;

  outputLimit?: number;
  contextWindow: number;

  supportsImages: boolean;
  supportsPromptCache: boolean;
  supportsComputerUse: boolean;

  millionInputTokensPrice: number; // Price per million input tokens in provider specific currency.
  millionOutputTokensPrice: number; // Price per million output tokens in provider specific currency.
  millionCacheWriteTokensPrice: number; // Price per million cache write tokens in provider specific currency.
  millionCacheReadTokensPrice: number; // Price per million cache read tokens in provider specific currency.

  imageFee: number; // Surcharge/fee per image in provider specific currency.
  requestFee: number; // Surcharge/fee per api request in provider specific currency.
}

export interface ProviderResponseStreamTextChunk {

  type: "text";
  content: string;
}

export interface ProviderResponseStreamImageChunk {

  type: "image";
  content: unknown;
  contentType: string;
}

export interface ProviderResponseStreamUsageChunk {

  type: "usage";
  inputTokenCount: number;
  outputTokenCount: number;
  cacheWriteTokenCount?: number;
  cacheReadTokenCount?: number;
}

export type ProviderResponseStreamChunk = ProviderResponseStreamTextChunk | ProviderResponseStreamImageChunk | ProviderResponseStreamUsageChunk;

export type ProviderResponseStream = AsyncGenerator<ProviderResponseStreamChunk>;
