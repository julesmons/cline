/*
# Recline SDK

The Recline extension exposes an SDK that can be used by other extensions. To use this SDK in your extension:

1. Copy `src/extension-api/recline.d.ts` to your extension's source directory.
2. Include `recline.d.ts` in your extension's compilation.
3. Get access to the SDK with the following code:

```ts
const reclineExtension = vscode.extensions.getExtension<ReclineSDK>("julesmons.recline");

if (!reclineExtension?.isActive) {
  throw new Error("Recline extension is not activated");
}

const recline = reclineExtension.exports;

if (recline) {
  // Now you can use the SDK

  // Set custom instructions
  await recline.setCustomInstructions("Talk like a pirate");

  // Get custom instructions
  const instructions = await recline.getCustomInstructions();
  console.log("Current custom instructions:", instructions);

  // Start a new task with an initial message
  await recline.startNewTask("Hello, Recline! Let's make a new project...");

  // Start a new task with an initial message and images
  await recline.startNewTask("Use this design language", ["data:image/webp;base64,..."]);

  // Send a message to the current task
  await recline.sendMessage("Can you fix the problems?");

  // Simulate pressing the primary button in the chat interface (e.g. 'Save' or 'Proceed While Running')
  await recline.pressPrimaryButton();

  // Simulate pressing the secondary button in the chat interface (e.g. 'Reject')
  await recline.pressSecondaryButton();
}
else {
  console.error("Recline SDK is not available");
}
```
**Note:** To ensure that the `julesmons.recline` extension is activated before your extension, add it to the `extensionDependencies` in your `package.json`:

```json
{
  "extensionDependencies": [
    "julesmons.recline"
  ]
}
```
*/

export interface ReclineSDK {
  /**
   * Sets the custom instructions in the global storage.
   * @param value The custom instructions to be saved.
   */
  setCustomInstructions: (value: string) => Promise<void>;

  /**
   * Retrieves the custom instructions from the global storage.
   * @returns The saved custom instructions, or undefined if not set.
   */
  getCustomInstructions: () => Promise<string | undefined>;

  /**
   * Starts a new task with an optional initial message and images.
   * @param task Optional initial task message.
   * @param images Optional array of image data URIs (e.g., "data:image/webp;base64,...").
   */
  startNewTask: (task?: string, images?: string[]) => Promise<void>;

  /**
   * Sends a message to the current task.
   * @param message Optional message to send.
   * @param images Optional array of image data URIs (e.g., "data:image/webp;base64,...").
   */
  sendMessage: (message?: string, images?: string[]) => Promise<void>;

  /**
   * Simulates pressing the primary button in the chat interface.
   */
  pressPrimaryButton: () => Promise<void>;

  /**
   * Simulates pressing the secondary button in the chat interface.
   */
  pressSecondaryButton: () => Promise<void>;
}
