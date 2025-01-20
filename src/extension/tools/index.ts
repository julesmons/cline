import type { Tool, ToolArgs } from "./tool";

import { ReplaceInFileTool } from "./filesystem/replaceInFile.tool";


export type ToolRegistry = Map<string, new (config: Record<string, unknown>) => Tool<ToolArgs>>;
export class ToolRegistrar {

  protected readonly tools: ToolRegistry;

  constructor() {
    this.tools = new Map<string, new (config: Record<string, unknown>) => Tool<ToolArgs>>([
      ["replace_in_file", ReplaceInFileTool]
    ]);
  }

  prepareTool<TArgs extends ToolArgs>(id?: string, args?: Record<string, unknown>): Tool<TArgs> {

    if (id == null) {
      throw new Error("Provider id not specified");
    }

    const ToolImpl = this.tools.get(id);

    if (ToolImpl == null) {
      throw new Error(`Tool with id ${id} not found`);
    }

    return new ToolImpl(args || {}) as Tool<TArgs>;
  }
}

export const modelProviderRegistrar = new ToolRegistrar();
