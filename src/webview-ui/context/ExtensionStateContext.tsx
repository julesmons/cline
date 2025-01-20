import type { McpServer } from "../../common/mcp";
import type {
  ApiConfiguration,
  ModelInfo
} from "../../common/api";
import type { ReclineEvent, ReclineState } from "../../common/ReclineEvent";

import { useEvent } from "react-use";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { vscodeApiWrapper } from "../utils/vscode";
import { findLastIndex } from "../../common/utils/array";
import { convertTextMateToHljs } from "../utils/textMateToHljs";
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "../../common/AutoApprovalSettings";
import {
  openRouterDefaultModelId,
  openRouterDefaultModelInfo
} from "../../common/api";


interface ReclineStateContextType extends ReclineState {
  didHydrateState: boolean;
  showWelcome: boolean;
  theme: any;
  openRouterModels: Record<string, ModelInfo>;
  mcpServers: McpServer[];
  filePaths: string[];
  setApiConfiguration: (config: ApiConfiguration) => void;
  setCustomInstructions: (value?: string) => void;
  setShowAnnouncement: (value: boolean) => void;
}

const ReclineStateContext = createContext<ReclineStateContextType | undefined>(undefined);

export const ReclineStateContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ReclineState>({
    version: "",
    reclineMessages: [],
    taskHistory: [],
    shouldShowAnnouncement: false,
    autoApprovalSettings: DEFAULT_AUTO_APPROVAL_SETTINGS
  });
  const [didHydrateState, setDidHydrateState] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [theme, setTheme] = useState<any>(undefined);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [openRouterModels, setOpenRouterModels] = useState<Record<string, ModelInfo>>({
    [openRouterDefaultModelId]: openRouterDefaultModelInfo
  });
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);

  const handleMessage = useCallback((event: MessageEvent) => {
    const message: ReclineEvent = event.data;
    switch (message.type) {
      case "state": {
        setState(message.state!);
        const config = message.state?.apiConfiguration;
        const hasKey = config
          ? [
            config.apiKey,
            config.openRouterApiKey,
            config.awsRegion,
            config.vertexProjectId,
            config.openAiApiKey,
            config.ollamaModelId,
            config.lmStudioModelId,
            config.geminiApiKey,
            config.openAiNativeApiKey,
            config.deepSeekApiKey,
            config.vsCodeLmModelSelector
          ].some(key => key !== undefined)
          : false;
        setShowWelcome(!hasKey);
        setDidHydrateState(true);
        break;
      }
      case "theme": {
        if (message.text) {
          setTheme(convertTextMateToHljs(JSON.parse(message.text)));
        }
        break;
      }
      case "workspaceUpdated": {
        setFilePaths(message.filePaths ?? []);
        break;
      }
      case "partialMessage": {
        const partialMessage = message.partialMessage!;
        setState((prevState) => {
          // worth noting it will never be possible for a more up-to-date message to be sent here or in normal messages post since the presentAssistantContent function uses lock
          const lastIndex = findLastIndex(prevState.reclineMessages, msg => msg.ts === partialMessage.ts);
          if (lastIndex !== -1) {
            const newReclineMessages = [...prevState.reclineMessages];
            newReclineMessages[lastIndex] = partialMessage;
            return { ...prevState, reclineMessages: newReclineMessages };
          }
          return prevState;
        });
        break;
      }
      case "openRouterModels": {
        const updatedModels = message.openRouterModels ?? {};
        setOpenRouterModels({
          [openRouterDefaultModelId]: openRouterDefaultModelInfo, // in case the extension sent a model list without the default model
          ...updatedModels
        });
        break;
      }
      case "mcpServers": {
        setMcpServers(message.mcpServers ?? []);
        break;
      }
    }
  }, []);

  useEvent("message", handleMessage);

  useEffect(() => {
    vscodeApiWrapper.postMessage({ type: "webviewDidLaunch" });
  }, []);

  const contextValue: ReclineStateContextType = {
    ...state,
    didHydrateState,
    showWelcome,
    theme,
    openRouterModels,
    mcpServers,
    filePaths,
    setApiConfiguration: value => setState(prevState => ({ ...prevState, apiConfiguration: value })),
    setCustomInstructions: value => setState(prevState => ({ ...prevState, customInstructions: value })),
    setShowAnnouncement: value => setState(prevState => ({ ...prevState, shouldShowAnnouncement: value }))
  };

  return <ReclineStateContext.Provider value={contextValue}>{children}</ReclineStateContext.Provider>;
};

export function useReclineState() {
  const context = useContext(ReclineStateContext);
  if (context == null) {
    throw new Error("useReclineState must be used within an ReclineStateContextProvider");
  }
  return context;
}
