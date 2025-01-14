// This is bad practice, but the Recline extension makes use of some specific claude features (like computer use) that not all models support.
export function isClaude(modelId: string): boolean {
  const whitelist = ["claude", "sonnet", "opus", "haiku"];
  return whitelist.some(id => modelId.includes(id));
}

export function isClaudeSonnet(modelId: string): boolean {
  return modelId.includes("sonnet");
}
//
