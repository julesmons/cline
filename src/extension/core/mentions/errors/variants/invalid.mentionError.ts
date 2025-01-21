import { MentionError } from "../mention.error";


export class InvalidMentionError extends MentionError {
  constructor(message: string) {
    super(message, "INVALID_MENTION");
  }
}
