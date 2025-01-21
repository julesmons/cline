export const claudeWhitelist: string[] = ["claude", "sonnet", "opus", "haiku"];

// Insecure helper function to estimate if a model is Claude (even though it's not directly from Anthropic)
export function isClaude(modelId: string): boolean {

  return claudeWhitelist.some(id => modelId.includes(id));
}

// Insecure helper function to estimate if a model is a Claude Sonnet model (even though it's not directly from Anthropic)
// Example usecases include: Attempting to enable browser usage features which are only available for Claude Sonnet models (and should be available regardless of the provider)
export function isClaudeSonnet(modelId: string): boolean {

  return modelId.includes("sonnet");
}
