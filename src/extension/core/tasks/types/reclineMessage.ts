import type { ReclineAsk, ReclineSay } from "../enums";


export interface ReclineBaseMessage {

  id: string; // Unique message ID.
  taskId: string; // ID of the task this message belongs to.
  modelProviderId: string; // ID of the model provider that generated this message. Relevant because the user is able to switch between providers during a task.

  ts: number; // Timestamp of the message, which is used to sort messages in the UI.
  partial: boolean; // Whether this message is a partial message or not.

  content?: string; // Content of the message. (Can sometimes possibly be a JSON string, needs to be examined further during the refactor.)
  contentTokenCount?: number; // Number of tokens in the content as calculated by the provider.
  images?: string[]; // Images in base64 format.
  totalCost?: number; // Total cost of the message at the time of creation.
}

export interface ReclineAskMessage extends ReclineBaseMessage {
  type: "ask";
  ask: ReclineAsk;
}

export interface ReclineSayMessage extends ReclineBaseMessage {
  type: "say";
  say: ReclineSay;
}

export type ReclineMessage = ReclineAskMessage | ReclineSayMessage;
