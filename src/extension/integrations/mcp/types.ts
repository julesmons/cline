export interface McpServer {
  name: string;
  config: string;
  status: "connected" | "connecting" | "disconnected";
  error?: string;
  tools?: McpTool[];
  resources?: McpResource[];
  resourceTemplates?: McpResourceTemplate[];
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: object;
}

export interface McpResource {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
}

export interface McpResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpResourceResponse {
  _meta?: Record<string, any>;
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
}

export interface McpToolCallResponse {
  _meta?: Record<string, any>;
  content: Array<
    | {
      type: "text";
      text: string;
    }
    | {
      type: "image";
      data: string;
      mimeType: string;
    }
    | {
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string;
        text?: string;
        blob?: string;
      };
    }
  >;
  isError?: boolean;
}
