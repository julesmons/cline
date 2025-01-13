import type OpenAI from "openai";

import type { MessageParamWithTokenCount } from "@shared/api";

import { Transformer } from "../transformer";


export abstract class OpenAICompatibleTransformer extends Transformer<OpenAI.Chat.ChatCompletionMessageParam> {

  public static toExternalMessages(messages: MessageParamWithTokenCount[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    throw new Error("Method not implemented.");
  }

  public static toInternalMessages(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): MessageParamWithTokenCount[] {
    throw new Error("Method not implemented.");
  }
}
