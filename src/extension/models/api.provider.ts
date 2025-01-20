import type { ModelProviderConfig } from "./provider";

import { z, type ZodSchema } from "zod";

import { StatefulModelProvider } from "./stateful.provider";


export interface APIModelProviderConfig extends ModelProviderConfig {
  apiKey: string;
  apiBaseURL: string;
}

// The API model provider is stateful because the client needs to be initialized.
export abstract class APIModelProvider<TConfig extends APIModelProviderConfig> extends StatefulModelProvider<TConfig> {
  // Needs to be overridden by the provider
  protected client: unknown | null = null;

  override getConfigSchema(): ZodSchema<TConfig> {
    return super.getConfigSchema().and(
      z.object({
        apiKey: z.string().trim().nonempty(),
        apiBaseURL: z.string().trim().nonempty()
      })
    ) as ZodSchema<TConfig>;
  }
}
