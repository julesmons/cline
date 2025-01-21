export interface ReclineTaskUsage {

  totalInputTokenCount: number;
  totalOutputTokenCount: number;
  totalCacheReadTokenCount: number;
  totalCacheWriteTokenCount: number;
  totalCost: number;
}
