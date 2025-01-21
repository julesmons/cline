export interface NotificationOptions {
  /** The notification message */
  message: string;
  /** Optional title to display before the message */
  title?: string;
  /** Optional array of actions to display */
  actions?: string[];
  /** Optional modal parameter to force user interaction */
  modal?: boolean;
}
