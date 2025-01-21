import type {
  ProviderResponseStreamImageChunk,
  ProviderResponseStreamTextChunk,
  ProviderResponseStreamUsageChunk
} from "./chunks";


export type ProviderResponseStreamChunk = ProviderResponseStreamTextChunk | ProviderResponseStreamImageChunk | ProviderResponseStreamUsageChunk;
