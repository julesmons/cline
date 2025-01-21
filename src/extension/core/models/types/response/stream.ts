import type { ProviderResponseStreamChunk } from "./chunk";


export type ProviderResponseStream = AsyncGenerator<ProviderResponseStreamChunk>;
