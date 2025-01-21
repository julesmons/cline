import type { ReclineMessage } from "./reclineMessage";
import type { ReclineTaskUsage } from "./reclineTaskUsage";


// TODO: Might need changes, but retain the de-duplication ideals when doing so.
export interface ReclineTask {

  id: string; // Unique task ID.
  ts: number; // Timestamp of the task, which is used to sort tasks in the UI.

  // Usage is continuously updated during the lifecycle of the task.
  usage: ReclineTaskUsage;

  // The messages that were exchanged between the user and the provider during the lifecycle of the task.
  // Will also be continuously updated during the lifecycle of the task.
  messages: ReclineMessage[];
}
