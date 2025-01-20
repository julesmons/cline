import type { ReclineEvent } from "../common/ReclineEvent";

import { useEvent } from "react-use";
import { useCallback, useEffect, useState } from "react";

import McpView from "./components/mcp/McpView";
import ChatView from "./components/chat/ChatView";
import { vscodeApiWrapper } from "./utils/vscode";
import HistoryView from "./components/history/HistoryView";
import WelcomeView from "./components/welcome/WelcomeView";
import SettingsView from "./components/settings/SettingsView";
import { ReclineStateContextProvider, useReclineState } from "./context/ReclineStateContext";


function AppContent() {
  const { didHydrateState, showWelcome, shouldShowAnnouncement } = useReclineState();
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMcp, setShowMcp] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  const handleMessage = useCallback((e: MessageEvent) => {
    const message: ReclineEvent = e.data;
    switch (message.type) {
      case "action":
        switch (message.action!) {
          case "settingsButtonClicked":
            setShowSettings(true);
            setShowHistory(false);
            setShowMcp(false);
            break;
          case "historyButtonClicked":
            setShowSettings(false);
            setShowHistory(true);
            setShowMcp(false);
            break;
          case "mcpButtonClicked":
            setShowSettings(false);
            setShowHistory(false);
            setShowMcp(true);
            break;
          case "chatButtonClicked":
            setShowSettings(false);
            setShowHistory(false);
            setShowMcp(false);
            break;
        }
        break;
    }
  }, []);

  useEvent("message", handleMessage);

  useEffect(() => {
    if (shouldShowAnnouncement) {
      setShowAnnouncement(true);
      vscodeApiWrapper.postMessage({ type: "didShowAnnouncement" });
    }
  }, [shouldShowAnnouncement]);

  if (!didHydrateState) {
    return null;
  }

  return (
    <>
      {showWelcome ? (
        <WelcomeView />
      ) : (
        <>
          {showSettings && <SettingsView onDone={() => setShowSettings(false)} />}
          {showHistory && <HistoryView onDone={() => setShowHistory(false)} />}
          {showMcp && <McpView onDone={() => setShowMcp(false)} />}
          {/* Do not conditionally load ChatView, it's expensive and there's state we don't want to lose (user input, disableInput, askResponse promise, etc.) */}
          <ChatView
            showHistoryView={() => {
              setShowSettings(false);
              setShowMcp(false);
              setShowHistory(true);
            }}
            isHidden={showSettings || showHistory || showMcp}
            showAnnouncement={showAnnouncement}
            hideAnnouncement={() => {
              setShowAnnouncement(false);
            }}
          />
        </>
      )}
    </>
  );
}

function App() {
  return (
    <ReclineStateContextProvider>
      <AppContent />
    </ReclineStateContextProvider>
  );
}

export default App;
