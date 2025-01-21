// TODO: Might need changes, but retain the de-duplication ideals when doing so.
export interface ReclineState {

  version: string; // The current version of the extension to be displayed in the UI.
  announcement?: string; // Announcement to be displayed in the UI.
  settings?: ReclineSettings; // The current settings of the extension which can be modified by the user in the UI.

  taskHistory: ReclineTask[]; // The history of all tasks that the user has created. Will be displayed in a virtual list in the UI.
}
