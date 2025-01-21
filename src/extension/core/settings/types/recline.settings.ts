import type { MCPReclineSettings } from "./mcp.reclineSettings";
import type { BrowserReclineSettings } from "./browser.reclineSettings";
import type { ModelProviderReclineSettings } from "./modelProvider.reclineSettings";


export interface ReclineSettings {

  preferences: {
    modelProvider: {
      selectedModelProviderId?: string; // The currently selected model provider.
      selectedModelId?: string; // The currently selected model of the selected model provider.
    };
  };

  lib: {
    modelProvider: ModelProviderReclineSettings; // Model provider related settings
  };

  integrations: {
    mcp: MCPReclineSettings; // MCP related settings
    browser: BrowserReclineSettings; // Browser related settings
  };
}
