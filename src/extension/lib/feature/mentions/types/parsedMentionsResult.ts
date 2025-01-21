import type { MentionContent } from "@extension/core/mentions";


export interface ParsedMentionsResult {
  text: string;
  mentions: MentionContent[];
}
