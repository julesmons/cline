import type { ZodSchema } from "zod";

import type { ModelProvider } from "@extension/models/provider";

import { z } from "zod";


export interface ToolArgs {}

export abstract class Tool<TArgs extends ToolArgs> {

  protected readonly args: z.infer<ReturnType<this["getArgSchema"]>>;

  protected constructor(public readonly name: string, args: Record<string, unknown>) {

    this.args = this.getArgSchema().parse(args);
  }

  abstract execute(invoker: ModelProvider<any>): Promise<void>;

  getArgSchema(): ZodSchema<TArgs> {
    // TODO: Remove the unknown cast.
    return z.object({}) as unknown as ZodSchema<TArgs>;
  };
}
