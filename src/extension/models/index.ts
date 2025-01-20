import type { ModelProvider, ModelProviderConfig } from "./provider";

import { VSCodeLmModelProvider } from "./providers/vscode-lm";


// import { OpenAIModelProvider } from "./providers/openai/openai";
// import { OpenAIAzureModelProvider } from "./providers/openai/openai-azure";
// import { OpenAILMStudioModelProvider } from "./providers/openai/openai-lmstudio";
// import { OpenAIDeepSeekModelProvider } from "./providers/openai/openai-deepseek";


export type ModelProviderRegistry = Map<string, new (config: Record<string, unknown>) => ModelProvider<ModelProviderConfig>>;
export class ModelProviderRegistrar {

  protected readonly providers: ModelProviderRegistry;

  constructor() {
    this.providers = new Map<string, new (config: Record<string, unknown>) => ModelProvider<ModelProviderConfig>>([
      ["vscode-lm", VSCodeLmModelProvider]
      // ["openai-azure", OpenAIAzureModelProvider],
      // ["openai-deepseek", OpenAIDeepSeekModelProvider],
      // ["openai-lmstudio", OpenAILMStudioModelProvider],
      // ["openai", OpenAIModelProvider]
    ]);
  }

  buildProvider<TConfig extends ModelProviderConfig>(id?: string, config?: Record<string, unknown>): ModelProvider<TConfig> {

    if (id == null) {
      throw new Error("Provider id not specified");
    }

    const Provider = this.providers.get(id);

    if (Provider == null) {
      throw new Error(`Provider with id ${id} not found`);
    }

    return new Provider(config || {}) as ModelProvider<TConfig>;
  }
}

export const modelProviderRegistrar = new ModelProviderRegistrar();
