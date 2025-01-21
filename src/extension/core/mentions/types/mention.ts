import type { MentionType } from "../enums";


export interface Mention {
  type: MentionType;
  value: string;
  raw: string;
}
