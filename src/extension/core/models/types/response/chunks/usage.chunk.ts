export interface ProviderResponseStreamUsageChunk {

  type: "usage";
  inputTokenCount: number;
  outputTokenCount: number;
  cacheWriteTokenCount?: number;
  cacheReadTokenCount?: number;
}
