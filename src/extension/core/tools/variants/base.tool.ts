import type { ZodSchema } from "zod";

import type { ReclineSettings } from "@extension/core/settings/types";
import type { ModelProvider } from "@extension/core/models/providers/provider";

import { z } from "zod";


export interface BaseToolArgs {}

export abstract class BaseTool<TArgs extends BaseToolArgs> {

  protected readonly args: z.infer<ReturnType<this["getArgSchema"]>>;

  protected constructor(public readonly name: string, args: Record<string, unknown>) {

    this.args = this.getArgSchema().parse(args);
  }

  abstract execute(invoker: ModelProvider<any>): Promise<void>;

  getArgSchema(): ZodSchema<TArgs> {
    // TODO: Remove the unknown cast.
    return z.object({}) as unknown as ZodSchema<TArgs>;
  }

  abstract requiresApproval(settings: ReclineSettings): Promise<boolean>;;

  /* override */ toString(): string {
    return `[${this.name}]`;
  }
}
