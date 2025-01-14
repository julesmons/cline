import type { ZodSchema } from "zod";

import type { MessageParamWithTokenCount, VertexModelId } from "@shared/api";

import type { ModelProviderConfig } from "../provider";
import type { Model, ProviderResponseStream } from "../types";

import { z } from "zod";
import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";

import { vertexDefaultModelId, vertexModels } from "@shared/api";

import { isClaudeSonnet } from "@extension/utils/model";

import { StatefulModelProvider } from "../stateful.provider";
import { AnthropicTransformer } from "../transformers/anthropic";


const ERROR_PREFIX = "Recline <Vertex>";

export interface VertexModelProviderConfig extends ModelProviderConfig {
  projectId: string;
  region: string;
}

export class VertexModelProvider extends StatefulModelProvider<VertexModelProviderConfig> {
  protected client: AnthropicVertex | null = null;

  constructor(config: Record<string, unknown>) {
    super("Vertex", config);
  }

  protected async onDispose(): Promise<void> {
    this.client = null;
  }

  protected async onInitialize(): Promise<void> {
    this.client = new AnthropicVertex({
      projectId: this.config.projectId,
      region: this.config.region
    });
  }

  async *createResponseStream(systemPrompt: string, messages: MessageParamWithTokenCount[]): ProviderResponseStream {
    if (this.client == null) {
      throw new Error(`${ERROR_PREFIX} Client not initialized`);
    }

    // Get current model
    const model = await this.getCurrentModel();

    try {
      const stream = await this.client.messages.create({
        model: model.id,
        max_tokens: model.outputLimit ?? 8192,
        temperature: 0,
        system: systemPrompt,
        messages: AnthropicTransformer.toExternalMessages(messages),
        stream: true
      });

      for await (const chunk of stream) {
        switch (chunk.type) {
          case "message_start": {
            const usage = chunk.message.usage;
            yield {
              type: "usage",
              inputTokenCount: usage.input_tokens ?? 0,
              outputTokenCount: usage.output_tokens ?? 0
            };
            break;
          }
          case "message_delta":
            yield {
              type: "usage",
              inputTokenCount: 0,
              outputTokenCount: chunk.usage.output_tokens ?? 0
            };
            break;
          case "content_block_start":
            if (chunk.content_block.type === "text") {
              if (chunk.index > 0) {
                yield {
                  type: "text",
                  content: "\n"
                };
              }
              yield {
                type: "text",
                content: chunk.content_block.text
              };
            }
            break;
          case "content_block_delta":
            if (chunk.delta.type === "text_delta") {
              yield {
                type: "text",
                content: chunk.delta.text
              };
            }
            break;
          case "message_stop":
          case "content_block_stop":
          // These events don't require any action
            break;
        }
      }
    }
    catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${ERROR_PREFIX} Stream creation failed: ${message}`);
    }
  }

  async getAllModels(): Promise<Model[]> {
    return Object.entries(vertexModels).map(([id, info]) => ({
      id,
      ...info,
      supportsComputerUse: isClaudeSonnet(id)
    }));
  }

  override getConfigSchema(): ZodSchema<VertexModelProviderConfig> {
    return super.getConfigSchema().and(
      z.object({
        projectId: z.string().trim().nonempty(),
        region: z.string().trim().nonempty()
      })
    );
  }

  async getCurrentModel(): Promise<Model> {
    if (this.config.modelId != null && this.config.modelId in vertexModels) {
      const id = this.config.modelId as VertexModelId;
      return {
        id,
        ...vertexModels[id],
        supportsComputerUse: isClaudeSonnet(id)
      };
    }

    return {
      id: vertexDefaultModelId,
      ...vertexModels[vertexDefaultModelId],
      supportsComputerUse: true
    };
  }
}
