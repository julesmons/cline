import type { SupportedLanguage } from "./supported";

import fs from "node:fs/promises";

import * as vscode from "vscode";

import { extensionUri } from "@extension/constants";


async function loadWasmFile(wasmUrl: string): Promise<ArrayBufferLike> {

  const fileName: string | undefined = wasmUrl.split("/").pop();

  if (fileName == null) {
    throw new Error("Failed to extract filename from WASM URL");
  }

  const wasmPath: vscode.Uri = vscode.Uri.joinPath(extensionUri, "dist", "assets", fileName);
  const wasmFile = await fs.readFile(wasmPath.fsPath);

  return new Uint8Array(wasmFile);
}

const wasmImporters: Record<SupportedLanguage, () => Promise<Uint8Array>> = {
  bash: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-bash.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  c: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-c.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  cpp: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-cpp.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  c_sharp: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-c_sharp.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  css: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-css.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  elisp: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-elisp.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  elixir: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-elixir.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  elm: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-elm.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  go: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-go.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  html: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-html.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  java: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-java.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  javascript: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-javascript.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  json: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-json.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  kotlin: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-kotlin.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  lua: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-lua.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  objc: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-objc.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  ocaml: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-ocaml.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  php: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-php.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  python: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-python.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  ql: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-ql.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  rescript: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-rescript.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  ruby: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-ruby.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  rust: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-rust.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  scala: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-scala.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  solidity: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-solidity.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  swift: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-swift.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  systemrdl: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-systemrdl.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  tlaplus: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-tlaplus.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  toml: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-toml.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  tsx: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-tsx.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  typescript: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-typescript.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  vue: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-vue.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  yaml: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-yaml.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  zig: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-zig.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  },
  embedded_template: async () => {
    const wasmUrl = (await import("tree-sitter-wasms/out/tree-sitter-embedded_template.wasm")).default.toString();
    return await loadWasmFile(wasmUrl) as Uint8Array;
  }
};

export async function importTreeSitterWasm(language: SupportedLanguage): Promise<Uint8Array> {
  console.log(`Attempting to load WASM for language: ${language}`);
  try {
    const wasm = await wasmImporters[language]();
    console.log(`Successfully loaded WASM for ${language}`);
    return wasm;
  }
  catch (error) {
    console.error(`Failed to load WASM for ${language}:`, error);
    throw error;
  }
}
