import type * as vscode from "vscode";
import type { Browser, ConsoleMessage, launch, Page } from "puppeteer-core";

import type { BrowserActionResult } from "@extension/core/tasks";

import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as process from "node:process";

import pWaitFor from "p-wait-for";
import { delay } from "es-toolkit";
import PCR from "puppeteer-chromium-resolver";
import { TimeoutError } from "puppeteer-core";

import { fileExistsAtPath } from "@common/utils/filesystem/fs";
import { extractMessageFromThrow } from "@common/utils/exception";


interface PCRStats {
  puppeteer: { launch: typeof launch };
  executablePath: string;
}

export class BrowserManager {
  private browser?: Browser;
  private context: vscode.ExtensionContext;
  private currentMousePosition?: string;
  private page?: Page;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  private async ensureChromiumExists(): Promise<PCRStats> {
    const globalStoragePath = this.context?.globalStorageUri?.fsPath;
    if (!globalStoragePath) {
      throw new Error("Global storage uri is invalid");
    }

    const puppeteerDir = path.join(globalStoragePath, "puppeteer");
    const dirExists = await fileExistsAtPath(puppeteerDir);
    if (!dirExists) {
      await fs.mkdir(puppeteerDir, { recursive: true });
    }

    // if chromium doesn't exist, this will download it to path.join(puppeteerDir, ".chromium-browser-snapshots")
    // if it does exist it will return the path to existing chromium
    // eslint-disable-next-line ts/no-unsafe-assignment, ts/no-unsafe-call
    const stats: PCRStats = await PCR({ downloadPath: puppeteerDir });

    process.env.PUPPETEER_EXECUTABLE_PATH = stats.executablePath;

    return stats;
  }

  // page.goto { waitUntil: "networkidle0" } may not ever resolve, and not waiting could return page content too early before js has loaded
  // https://stackoverflow.com/questions/52497252/puppeteer-wait-until-page-is-completely-loaded/61304202#61304202
  private async waitTillHTMLStable(page: Page, timeout = 5_000): Promise<void> {
    const checkDurationMsecs = 500; // 1000
    const maxChecks = timeout / checkDurationMsecs;
    let lastHTMLSize = 0;
    let checkCounts = 1;
    let countStableSizeIterations = 0;
    const minStableSizeIterations = 3;

    while (checkCounts++ <= maxChecks) {
      const html = await page.content();
      const currentHTMLSize = html.length;

      // let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length)
      console.log("last: ", lastHTMLSize, " <> curr: ", currentHTMLSize);

      if (lastHTMLSize !== 0 && currentHTMLSize === lastHTMLSize) {
        countStableSizeIterations++;
      }
      else {
        countStableSizeIterations = 0; // reset the counter
      }

      if (countStableSizeIterations >= minStableSizeIterations) {
        console.log("Page rendered fully...");
        break;
      }

      lastHTMLSize = currentHTMLSize;
      await delay(checkDurationMsecs);
    }
  }

  async click(coordinate: string): Promise<BrowserActionResult> {
    const [x, y] = coordinate.split(",").map(Number);
    return this.doAction(async (page) => {
      // Set up network request monitoring
      let hasNetworkActivity = false;
      const requestListener = (): void => {
        hasNetworkActivity = true;
      };
      page.on("request", requestListener);

      // Perform the click
      await page.mouse.click(x, y);
      this.currentMousePosition = coordinate;

      // Small delay to check if click triggered any network activity
      await delay(100);

      if (hasNetworkActivity) {
        // If we detected network activity, wait for navigation/loading
        await page
          .waitForNavigation({
            waitUntil: ["domcontentloaded", "networkidle2"],
            timeout: 7000
          })
          .catch(() => {});
        await this.waitTillHTMLStable(page);
      }

      // Clean up listener
      page.off("request", requestListener);
    });
  }

  async closeBrowser(): Promise<BrowserActionResult> {
    if (this.browser || this.page) {
      console.log("closing browser...");
      await this.browser?.close().catch(() => {});
      this.browser = undefined;
      this.page = undefined;
      this.currentMousePosition = undefined;
    }
    return {};
  }

  async doAction(action: (page: Page) => Promise<void>): Promise<BrowserActionResult> {
    if (!this.page) {
      throw new Error(
        "Browser is not launched. This may occur if the browser was automatically closed by a non-`browser_action` tool."
      );
    }

    const logs: string[] = [];
    let lastLogTs = Date.now();

    const consoleListener = (msg: ConsoleMessage): void => {
      if (msg.type() === "log") {
        logs.push(msg.text());
      }
      else {
        logs.push(`[${msg.type()}] ${msg.text()}`);
      }
      lastLogTs = Date.now();
    };

    const errorListener = (err: Error): void => {
      logs.push(`[Page Error] ${err.toString()}`);
      lastLogTs = Date.now();
    };

    // Add the listeners
    this.page.on("console", consoleListener);
    this.page.on("pageerror", errorListener);

    try {
      await action(this.page);
    }
    catch (err) {
      if (!(err instanceof TimeoutError)) {
        logs.push(`[Error] ${extractMessageFromThrow(err)}`);
      }
    }

    // Wait for console inactivity, with a timeout
    await pWaitFor(() => Date.now() - lastLogTs >= 500, {
      timeout: 3_000,
      interval: 100
    }).catch(() => {});

    let screenshotBase64: string = await this.page.screenshot({
      type: "webp",
      encoding: "base64"
    });

    let screenshot = `data:image/webp;base64,${screenshotBase64}`;

    if (!screenshotBase64) {
      console.log("webp screenshot failed, trying png");
      screenshotBase64 = await this.page.screenshot({
        type: "png",
        encoding: "base64"
      });
      screenshot = `data:image/png;base64,${screenshotBase64}`;
    }

    if (!screenshotBase64) {
      throw new Error("Failed to take screenshot.");
    }

    // this.page.removeAllListeners() <- causes the page to crash!
    this.page.off("console", consoleListener);
    this.page.off("pageerror", errorListener);

    return {
      screenshot,
      logs: logs.join("\n"),
      currentUrl: this.page.url(),
      currentMousePosition: this.currentMousePosition
    };
  }

  async launchBrowser(): Promise<void> {

    // Close the browser if it's already open
    if (this.browser) {
      await this.closeBrowser();
    }

    const stats = await this.ensureChromiumExists();
    this.browser = await stats.puppeteer.launch({
      executablePath: stats.executablePath,
      defaultViewport: {
        width: 900,
        height: 600
      },
      headless: true
    });

    this.page = await this.browser?.newPage();
  }

  async navigateToUrl(url: string): Promise<BrowserActionResult> {
    return this.doAction(async (page) => {
      // networkidle2 isn't good enough since page may take some time to load. we can assume locally running dev sites will reach networkidle0 in a reasonable amount of time
      await page.goto(url, { timeout: 7_000, waitUntil: ["domcontentloaded", "networkidle2"] });
      // await page.goto(url, { timeout: 10_000, waitUntil: "load" })
      await this.waitTillHTMLStable(page); // in case the page is loading more resources
    });
  }

  async scrollDown(): Promise<BrowserActionResult> {
    return this.doAction(async (page) => {
      await page.evaluate(() => {
        window.scrollBy({
          top: 600,
          behavior: "auto"
        });
      });
      await delay(300);
    });
  }

  async scrollUp(): Promise<BrowserActionResult> {
    return this.doAction(async (page) => {
      await page.evaluate(() => {
        window.scrollBy({
          top: -600,
          behavior: "auto"
        });
      });
      await delay(300);
    });
  }

  async type(text: string): Promise<BrowserActionResult> {
    return this.doAction(async (page) => {
      await page.keyboard.type(text);
    });
  }
}
