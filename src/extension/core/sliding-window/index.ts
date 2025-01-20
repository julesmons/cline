import type { ModelProviderMessage } from "@shared/api";

import type { Model } from "@extension/models/types";


export function truncateHalfConversation(
  model: Model,
  messages: ModelProviderMessage[]
): ModelProviderMessage[] {

  // Always keep the first Task message
  const firstTaskMessage = messages[0];
  const truncatedMessages: ModelProviderMessage[] = [firstTaskMessage];

  // Group messages into user-assistant pairs including tool use and tool result messages
  const pairs: ModelProviderMessage[][] = [];
  let i = 1; // Start from index 1 since index 0 is the first Task message

  while (i < messages.length) {
    const pair: ModelProviderMessage[] = [messages[i]];
    i++;
    // Add assistant's response and any tool use/tool result messages
    while (i < messages.length && messages[i].role === "assistant") {
      pair.push(messages[i]);
      i++;
    }
    pairs.push(pair);
  }

  // Calculate token counts for each pair
  const pairTokenCounts = pairs.map(
    pair => pair.reduce(
      (acc, msg) => acc + (msg.tokenCount ?? 0),
      0
    )
  );

  // Select pairs from the end until the total token count is within the limit
  const selectedPairs: ModelProviderMessage[][] = [];
  let currentTokenCount: number = 0;
  for (let j = pairs.length - 1; j >= 0; j--) {
    if (currentTokenCount + pairTokenCounts[j] <= model.contextWindow - (firstTaskMessage.tokenCount ?? 0)) {
      selectedPairs.unshift(pairs[j]);
      currentTokenCount += pairTokenCounts[j];
    }
  }

  // Combine the selected pairs and the first Task message
  truncatedMessages.push(...selectedPairs.flat());

  return truncatedMessages;
}
