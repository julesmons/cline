import { useEffect, useState } from "react";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";

import { vscodeApiWrapper } from "@webview-ui/utils/vscode";
import ApiOptions from "@webview-ui/components/settings/ApiOptions";
import { validateApiConfiguration } from "@webview-ui/utils/validate";
import { useReclineState } from "@webview-ui/context/ReclineStateContext";


function WelcomeView() {
  const { apiConfiguration } = useReclineState();

  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(undefined);

  const disableLetsGoButton = apiErrorMessage != null;

  const handleSubmit = () => {
    vscodeApiWrapper.postMessage({ type: "apiConfiguration", apiConfiguration });
  };

  useEffect(() => {
    setApiErrorMessage(validateApiConfiguration(apiConfiguration));
  }, [apiConfiguration]);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, padding: "0 20px" }}>
      <h2>Ready When You Are.</h2>
      <p>Recline is your new AI assistant, ready to help you create, edit, and run code—all while you sit back and relax. It integrates seamlessly with your CLI and editor to make coding feel effortless.</p>

      <b>Before we dive in, let's set up your AI provider.</b>

      <div style={{ marginTop: "10px" }}>
        <ApiOptions showModelOptions={false} />
        <VSCodeButton onClick={handleSubmit} disabled={disableLetsGoButton} style={{ marginTop: "3px" }}>
          Let's go!
        </VSCodeButton>
      </div>
    </div>
  );
}

export default WelcomeView;
