import { memo, useEffect, useState } from "react";
import { VSCodeButton, VSCodeLink, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";

import { vscodeApiWrapper } from "@webview-ui/utils/vscode";
import { useReclineState } from "@webview-ui/context/ReclineStateContext";
import { validateApiConfiguration, validateModelId } from "@webview-ui/utils/validate";

import ApiOptions from "./ApiOptions";


interface SettingsViewProps {
  onDone: () => void;
}

function SettingsView({ onDone }: SettingsViewProps) {
  const { apiConfiguration, version, customInstructions, setCustomInstructions, openRouterModels }
		= useReclineState();
  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(undefined);
  const [modelIdErrorMessage, setModelIdErrorMessage] = useState<string | undefined>(undefined);
  const handleSubmit = () => {
    const apiValidationResult = validateApiConfiguration(apiConfiguration);
    const modelIdValidationResult = validateModelId(apiConfiguration, openRouterModels);

    setApiErrorMessage(apiValidationResult);
    setModelIdErrorMessage(modelIdValidationResult);
    if (!apiValidationResult && !modelIdValidationResult) {
      vscodeApiWrapper.postMessage({ type: "apiConfiguration", apiConfiguration });
      vscodeApiWrapper.postMessage({ type: "customInstructions", text: customInstructions });
      onDone();
    }
  };

  useEffect(() => {
    setApiErrorMessage(undefined);
    setModelIdErrorMessage(undefined);
  }, [apiConfiguration]);

  // validate as soon as the component is mounted
  /*
	useEffect will use stale values of variables if they are not included in the dependency array. so trying to use useEffect with a dependency array of only one value for example will use any other variables' old values. In most cases you don't want this, and should opt to use react-use hooks.

	useEffect(() => {
		// uses someVar and anotherVar
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [someVar])

	If we only want to run code once on mount we can use react-use's useEffectOnce or useMount
	*/

  const handleResetState = () => {
    vscodeApiWrapper.postMessage({ type: "resetState" });
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: "10px 0px 0px 20px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "17px",
          paddingRight: 17
        }}
      >
        <h3 style={{ color: "var(--vscode-foreground)", margin: 0 }}>Settings</h3>
        <VSCodeButton onClick={handleSubmit}>Done</VSCodeButton>
      </div>
      <div
        style={{ flexGrow: 1, overflowY: "scroll", paddingRight: 8, display: "flex", flexDirection: "column" }}
      >
        <div style={{ marginBottom: 5 }}>
          <ApiOptions
            showModelOptions={true}
            apiErrorMessage={apiErrorMessage}
            modelIdErrorMessage={modelIdErrorMessage}
          />
        </div>

        <div style={{ marginBottom: 5 }}>
          <VSCodeTextArea
            value={customInstructions ?? ""}
            style={{ width: "100%" }}
            rows={4}
            placeholder={
              "e.g. \"Run unit tests at the end\", \"Use TypeScript with async/await\", \"Speak in Spanish\""
            }
            onInput={(e: any) => setCustomInstructions(e.target?.value ?? "")}
          >
            <span style={{ fontWeight: "500" }}>Custom Instructions</span>
          </VSCodeTextArea>
          <p
            style={{
              fontSize: "12px",
              marginTop: "5px",
              color: "var(--vscode-descriptionForeground)"
            }}
          >
            These instructions are appended to the system prompt sent with every request.
          </p>
        </div>

        <div
          style={{
            textAlign: "center",
            color: "var(--vscode-descriptionForeground)",
            fontSize: "12px",
            lineHeight: "1.2",
            marginTop: "auto",
            padding: "10px 8px 15px 0px"
          }}
        >
          <p style={{ wordWrap: "break-word", margin: 0, padding: 0 }}>
            <VSCodeLink href="https://github.com/julesmons/recline" style={{ display: "inline" }}>
              https://github.com/julesmons/recline
            </VSCodeLink>
          </p>
          <p style={{ fontStyle: "italic", margin: "10px 0 0 0", padding: 0 }}>
            v
            {" "}
            {version}
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(SettingsView);
