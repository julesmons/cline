import type { ReclineMessage } from "@extension/core/tasks/types";


export abstract class Transformer<T> {
  public abstract toExternalMessages(internalMessages: ReclineMessage[]): T[];
  public abstract toInternalMessages(externalMessages: T[]): ReclineMessage[];
}
