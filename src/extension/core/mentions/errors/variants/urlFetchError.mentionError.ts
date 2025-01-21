import { MentionError } from "../mention.error";


export class UrlFetchError extends MentionError {
  constructor(message: string) {
    super(message, "URL_FETCH_ERROR");
  }
}
