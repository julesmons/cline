import type { Model } from "@extension/models/types";

import type { OpenAICompatibleModelProviderConfig } from "./openai-compatible";

import OpenAI from "openai";
import { fetch } from "undici";

import { OpenAIOpenRouterTransformer } from "@extension/api/transformers/openai-openrouter";

import { OpenAICompatibleModelProvider } from "./openai-compatible";


// The following snippet is from the OpenRouter API documentation (https://openrouter.ai/docs/models):
// {
//   "data": [
//     {
//       "id": "meta-llama/llama-3-8b-instruct",
//       "name": "Meta: Llama 3 8B Instruct",
//       "created": 1723593600,
//       "description": "Meta's latest class of model (Llama 3) launched with a variety of sizes & flavors. This 8B instruct-tuned ...",
//       "pricing": {
//         "prompt": "string",
//         "completion": "string",
//         "request": "string",
//         "image": "string"
//       },
//       "context_length": 8192,
//       "architecture": {
//         "tokenizer": "Router",
//         "instruct_type": "None",
//         "modality": "TextToText"
//       },
//       "top_provider": {
//         "max_completion_tokens": 0,
//         "is_moderated": true
//       },
//       "per_request_limits": {
//         "prompt_tokens": "string",
//         "completion_tokens": "string"
//       }
//     }
//   ]
// }

// All fields have been marked optional to ensure correct handling of missing fields. (In the event of external API changes)
// TODO: Should be moved to the transformer file once it exists.
export interface OpenRouterModelInfo {

  id?: string;
  name?: string;
  created?: number;
  description?: string;
  pricing?: {
    prompt?: string;
    completion?: string;
    request?: string;
    image?: string;
  };
  context_length?: number;
  architecture?: {
    tokenizer?: string;
    instruct_type?: string;
    modality?: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  per_request_limits?: {
    prompt_tokens?: string;
    completion_tokens?: string;
  };
}

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
