import { fetch } from "undici";
import sanitizeHtml from "sanitize-html";


export abstract class NetworkService {

  public static async fetch(url: string): Promise<string> {

    const response = await fetch(url);
    const content = await response.text();

    if (response.headers.has("Content-Type") && response.headers.get("Content-Type")?.includes("text/html")) {
      return sanitizeHtml(content);
    }

    return content;
  }
}
