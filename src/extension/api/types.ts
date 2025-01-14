export interface Model {

  id: string;

  outputLimit?: number;
  contextWindow: number;

  supportsImages: boolean;
  supportsPromptCache: boolean;
  supportsComputerUse: boolean;

  inputPrice?: number;
  outputPrice?: number;
  cacheWritesPrice?: number;
  cacheReadsPrice?: number;

  imageSurcharge?: number;
  requestSurcharge?: number;
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
