import type { ZodSchema } from "zod";

import type { ModelProvider } from "@extension/core/models/providers/provider";

import type { BaseArgs } from "../../../core/tools/variants/base.tool";

import { z } from "zod";

import { BaseTool } from "../../../core/tools/variants/base.tool";


export interface ReplaceInFileToolArgs extends BaseArgs {
  filePath: string;
  searchValue: string;
  replaceValue: string;
}

export class ReplaceInFileTool extends BaseTool<ReplaceInFileToolArgs> {

  public constructor(args: Record<string, unknown>) {
    super("replace_in_file", args);
  }

  async execute(_invoker: ModelProvider<any>): Promise<void> {
    throw new Error("Method not implemented.");
  }

  getArgSchema(): ZodSchema<ReplaceInFileToolArgs> {
    return super.getArgSchema().and(
      z.object({
        filePath: z.string().trim().nonempty(),
        searchValue: z.string().trim().nonempty(),
        replaceValue: z.string().trim().nonempty()
      })
    );
  }
}
