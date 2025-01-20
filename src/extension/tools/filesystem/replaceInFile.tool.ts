import type { ZodSchema } from "zod";

import type { ModelProvider } from "@extension/models/provider";

import type { ToolArgs } from "../tool";

import { z } from "zod";

import { Tool } from "../tool";


export interface ReplaceInFileToolArgs extends ToolArgs {
  filePath: string;
  searchValue: string;
  replaceValue: string;
}

export class ReplaceInFileTool extends Tool<ReplaceInFileToolArgs> {

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
