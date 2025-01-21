import type { ModelProvider, ModelProviderConfig } from "./providers/provider";

import { StatefulModelProvider } from "./providers/stateful.provider";


export type ModelProviderRegistry = Map<string, new (config: Record<string, unknown>) => ModelProvider<ModelProviderConfig>>;
export class ModelProviderManager {

  protected modelProviderInstances: ModelProvider<ModelProviderConfig>[] = [];

  constructor(protected readonly modelProviderRegistry: ModelProviderRegistry) {}

  protected constructModelProvider<TConfig extends ModelProviderConfig>(id?: string, config?: Record<string, unknown>): ModelProvider<TConfig> {

    // 1. Ensure the provider id is specified
    if (id == null) {
      throw new Error("Provider id not specified");
    }

    // 2. Retrieve the provider constructor/factory
    const Provider = this.modelProviderRegistry.get(id);

    // 3. Ensure the provider constructor/factory exists
    if (Provider == null) {
      throw new Error(`Provider with id ${id} not found`);
    }

    // 4. Construct the provider
    return new Provider(config || {}) as ModelProvider<TConfig>;
  }

  public async instantiateModelProvider<TConfig extends ModelProviderConfig>(id?: string, config?: Record<string, unknown>): Promise<ModelProvider<TConfig>> {

    // 1. Construct the provider
    const provider = this.constructModelProvider<TConfig>(id, config);

    // 2. Initialize the provider, when applicable
    if (provider instanceof StatefulModelProvider) {
      await provider.initialize();
    }

    // 3. Store the provider instance to avoid leaking.
    this.modelProviderInstances.push(provider);

    // 4. Return the provider
    return provider;
  }

  public async dispose(): Promise<void> {

    // 1. Dispose all stateful providers
    for (const provider of this.modelProviderInstances) {
      if (provider instanceof StatefulModelProvider) {
        await provider.dispose();
      }
    }

    // 2. Clear the provider instances, marking them for garbage collection.
    this.modelProviderInstances = [];
  }
}
