import type { ModelProviderConfig } from "@extension/core/models";

import type { AutoApprovalReclineSettings } from "./autoApproval.reclineSettings";

export type ModelProviderReclineSettings = Record<string, {
  config: ModelProviderConfig & Record<string, unknown>; // Provider specific configuration (e.g. API url and/or key)
  autoApproval: AutoApprovalReclineSettings; // Auto-approval settings for this provider
  customInstructions: string; // Provider specific instructions
}>;
