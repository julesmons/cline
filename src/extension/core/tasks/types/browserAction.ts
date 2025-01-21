export const browserActions = ["launch", "click", "type", "scroll_down", "scroll_up", "close"] as const;
export type BrowserAction = (typeof browserActions)[number];
