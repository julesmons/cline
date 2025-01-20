declare module "*.wasm" {
  const content: URL;
  export default content;
}

declare module "puppeteer-chromium-resolver" {
  import * as PCR from "puppeteer-chromium-resolver";


  export default PCR;
}
