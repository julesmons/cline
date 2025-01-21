import type { ModelProviderConfig } from "./provider";

import { ModelProvider } from "./provider";


export abstract class StatefulModelProvider<TConfig extends ModelProviderConfig> extends ModelProvider<TConfig> {

  protected initialized: boolean = false;

  protected constructor(name: string, config: Record<string, unknown>) {
    super(name, config);
  }

  protected abstract onDispose(): Promise<void>;
  protected abstract onInitialize(): Promise<void>;

  async dispose(): Promise<void> {

    if (!this.initialized) {
      return;
    }

    await this.onDispose();
    this.initialized = false;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.onInitialize();
    this.initialized = true;
  }
}
