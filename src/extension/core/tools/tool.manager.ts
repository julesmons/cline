import type { BaseTool, BaseToolArgs } from "./variants/base.tool";

import { StatefulTool } from "./variants/stateful.tool";


export type ToolRegistry = Map<string, new (config: Record<string, unknown>) => BaseTool<BaseToolArgs>>;
export class ToolManager {

  protected toolInstances: BaseTool<BaseToolArgs>[] = [];

  constructor(protected readonly toolRegistry: ToolRegistry) {}

  protected constructTool<TArgs extends BaseToolArgs>(id?: string, config?: Record<string, unknown>): BaseTool<TArgs> {

    // Ensure the tool id is specified
    if (id == null) {
      throw new Error("Provider id not specified");
    }

    // Retrieve the tool constructor/factory
    const Provider = this.toolRegistry.get(id);

    // Ensure the tool constructor/factory exists
    if (Provider == null) {
      throw new Error(`Provider with id ${id} not found`);
    }

    // Construct the tool
    return new Provider(config || {}) as BaseTool<TArgs>;
  }

  public async instantiateTool<TArgs extends BaseToolArgs>(id?: string, config?: Record<string, unknown>): Promise<BaseTool<TArgs>> {

    // 1. Construct the tool
    const tool = this.constructTool<TArgs>(id, config);

    // 2. Initialize the tool, when applicable
    if (tool instanceof StatefulTool) {
      await tool.initialize();
    }

    // 3. Store the tool instance to avoid leaking.
    this.toolInstances.push(tool);

    // 4. Return the tool
    return tool;
  }

  public async dispose(): Promise<void> {

    // Dispose all stateful tools
    for (const tool of this.toolInstances) {
      if (tool instanceof StatefulTool) {
        await tool.dispose();
      }
    }

    // Clear the tool instances, marking them for garbage collection.
    this.toolInstances = [];
  }
}
