import type { ZodSchema } from "zod";

import type { ModelProvider } from "@extension/core/models/providers/provider";

import type { BaseArgs } from "../../../core/tools/variants/base.tool";

import { z } from "zod";

import { BaseTool } from "../../../core/tools/variants/base.tool";


export interface ReadFileToolArgs extends BaseArgs {
  filePath: string;
}

export class ReadFileTool extends BaseTool<ReadFileToolArgs> {

  public constructor(args: Record<string, unknown>) {
    super("read_file", args);
  }

  async execute(_invoker: ModelProvider<any>): Promise<void> {
    throw new Error("Method not implemented.");
  }

  getArgSchema(): ZodSchema<ReadFileToolArgs> {
    return super.getArgSchema().and(
      z.object({
        filePath: z.string().trim().nonempty()
      })
    );
  }

  override toString(): string {
    return `[${this.name} for ${this.args.filePath}]`;
  }
}
