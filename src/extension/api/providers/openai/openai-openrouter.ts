import type { Model } from "@extension/api/types";
import type { OpenRouterModelInfo } from "@extension/api/transformers/openai-openrouter";

import type { OpenAICompatibleModelProviderConfig } from "./openai-compatible";

import OpenAI from "openai";
import { fetch } from "undici";

import { OpenAIOpenRouterTransformer } from "@extension/api/transformers/openai-openrouter";

import { OpenAICompatibleModelProvider } from "./openai-compatible";


export interface OpenAIOpenRouterModelProviderConfig extends OpenAICompatibleModelProviderConfig { }

export class OpenAIOpenRouterModelProvider extends OpenAICompatibleModelProvider<OpenAIOpenRouterModelProviderConfig> {

  constructor({ apiBaseURL, ...options }: Record<string, unknown>) {
    super("OpenAI OpenRouter", {
      ...options,
      apiBaseURL: (apiBaseURL as string) || "https://openrouter.ai/api/v1"
    });
  }

  async getAllModels(): Promise<Model[]> {

    const urlBuilder = new URL(`${this.config.apiBaseURL}/models`);

    // TODO: Determine wether or not temperature configuration should be a requirement.
    urlBuilder.searchParams.append("supported_parameters", ["temperature", "tools"].join(",")); // @TODO: Provider specific config system?

    const res = await fetch(urlBuilder.toString());
    const json = await res.json() as { data: OpenRouterModelInfo[] };

    if (json?.data == null || !Array.isArray(json.data)) {
      throw new Error("Invalid model list response from OpenRouter");
    }

    return OpenAIOpenRouterTransformer.toInternalModels(json.data);
  }

  public override async onInitialize(): Promise<void> {
    this.client = new OpenAI({
      baseURL: this.config.apiBaseURL,
      apiKey: this.config.apiKey,
      defaultHeaders: {
        "HTTP-Referer": "https://recline.julesmons.nl/",
        "X-Title": "Recline"
      }
    });
  }
}
