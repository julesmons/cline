import { MentionError } from "../mention.error";


export class FileAccessError extends MentionError {
  constructor(message: string) {
    super(message, "FILE_ACCESS_ERROR");
  }
}
