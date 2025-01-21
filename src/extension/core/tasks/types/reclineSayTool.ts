export interface ReclineSayTool {
  tool:
    | "editedExistingFile"
    | "newFileCreated"
    | "readFile"
    | "listFilesTopLevel"
    | "listFilesRecursive"
    | "listCodeDefinitionNames"
    | "searchFiles";
  path?: string;
  diff?: string;
  content?: string;
  regex?: string;
  filePattern?: string;
}
