import equal from "fast-deep-equal";
import * as vscode from "vscode";


declare module "vscode" {

    enum LanguageModelChatMessageRole {

        User = 1,
        Assistant = 2
    }

    enum LanguageModelChatToolMode {

        Auto = 1,
        Required = 2
    }

    interface LanguageModelChatSelector {

        vendor?: string;
        family?: string;
        version?: string;
        id?: string;
    }

    interface LanguageModelChatTool {

        name: string;
        description: string;
        inputSchema?: object;
    }

    interface LanguageModelChatRequestOptions {

        justification?: string;
        modelOptions?: { [name: string]: any; };
        tools?: LanguageModelChatTool[];
        toolMode?: LanguageModelChatToolMode;
    }

    class LanguageModelTextPart {

        value: string;

        constructor(value: string);
    }

    class LanguageModelToolCallPart {

        callId: string;
        name: string;
        input: object;

        constructor(callId: string, name: string, input: object);
    }

    interface LanguageModelChatResponse {

        stream: AsyncIterable<LanguageModelTextPart | LanguageModelToolCallPart | unknown>;
        text: AsyncIterable<string>;
    }

    interface LanguageModelChat {

        readonly name: string;
        readonly id: string;
        readonly vendor: string;
        readonly family: string;
        readonly version: string;
        readonly maxInputTokens: number;

        sendRequest(messages: LanguageModelChatMessage[], options?: LanguageModelChatRequestOptions, token?: CancellationToken): Thenable<LanguageModelChatResponse>;
        countTokens(text: string | LanguageModelChatMessage, token?: CancellationToken): Thenable<number>;
    }

    class LanguageModelPromptTsxPart {

        value: unknown;

        constructor(value: unknown);
    }

    class LanguageModelToolResultPart {

        callId: string;
        content: Array<LanguageModelTextPart | LanguageModelPromptTsxPart | unknown>;

        constructor(callId: string, content: Array<LanguageModelTextPart | LanguageModelPromptTsxPart | unknown>);
    }

    class LanguageModelChatMessage {

        static User(content: string | Array<LanguageModelTextPart | LanguageModelToolResultPart>, name?: string): LanguageModelChatMessage;
        static Assistant(content: string | Array<LanguageModelTextPart | LanguageModelToolCallPart>, name?: string): LanguageModelChatMessage;

        role: LanguageModelChatMessageRole;
        content: Array<LanguageModelTextPart | LanguageModelToolResultPart | LanguageModelToolCallPart>;
        name: string | undefined;

        constructor(role: LanguageModelChatMessageRole, content: string | Array<LanguageModelTextPart | LanguageModelToolResultPart | LanguageModelToolCallPart>, name?: string);
    }

    namespace lm {

        function selectChatModels(selector?: LanguageModelChatSelector): Thenable<LanguageModelChat[]>;
    }
}

export function isVsCodeLmModelSelectorEqual(a: any, b: any): boolean {

    return equal(a, b);
}

export function stringifyVsCodeLmModelSelector(selector: vscode.LanguageModelChatSelector): string {

    if (!selector.vendor || !selector.family) {

        return selector.id || "";
    }

    return `${selector.vendor} / ${selector.family}`;
}

export function parseVsCodeLmModelSelector(stringifiedSelector: string): vscode.LanguageModelChatSelector {

    if (!stringifiedSelector.includes(" / ")) {

        return { id: stringifiedSelector };
    }

    const parts: string[] = stringifiedSelector.split(" / ");
    if (parts.length !== 2) {
        
        return { id: stringifiedSelector };
    }

    return { vendor: parts[0], family: parts[1] };
}