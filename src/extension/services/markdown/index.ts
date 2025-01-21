import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkStringify from "remark-stringify";


export abstract class MarkdownService {

  public static async fromHTML(html: string): Promise<string> {

    const markdown = await unified()
      .use(rehypeParse)
      .use(rehypeRemark)
      .use(remarkStringify)
      .process(html);

    return markdown.toString();
  }
}
