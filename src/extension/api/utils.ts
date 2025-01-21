// Function to calculate a rough estimate of the number of tokens in a string.
// Token-counts are required for Recline's sliding context window feature, but some providers might be unable to provide this information.
export function roughlyEstimateTokenCount(text: string): number {
  return text.split(/\s+/).length;
}
