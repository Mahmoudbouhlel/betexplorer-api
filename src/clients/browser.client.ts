import { chromium, type Browser, type Page, type Route } from "playwright";
import { env } from "../config/env.js";
import { recordBrowserLaunch, setBrowserPageStats } from "../services/performance.service.js";

let browser: Browser | null = null;
let activePages = 0;
const waiters: Array<() => void> = [];

async function getBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser;
  browser = await chromium.launch({
    headless: env.HEADLESS,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  recordBrowserLaunch();
  browser.on("disconnected", () => {
    browser = null;
  });
  return browser;
}

async function acquirePageSlot(): Promise<void> {
  if (activePages < env.BROWSER_MAX_PAGES) {
    activePages += 1;
    setBrowserPageStats(activePages, waiters.length);
    return;
  }
  await new Promise<void>((resolve) => {
    waiters.push(resolve);
    setBrowserPageStats(activePages, waiters.length);
  });
  activePages += 1;
  setBrowserPageStats(activePages, waiters.length);
}

function releasePageSlot(): void {
  activePages = Math.max(0, activePages - 1);
  const next = waiters.shift();
  setBrowserPageStats(activePages, waiters.length);
  next?.();
}

export async function withPage<T>(
  callback: (page: Page) => Promise<T>,
  options: {
    blockImages?: boolean;
  } = {},
): Promise<T> {
  await acquirePageSlot();
  const activeBrowser = await getBrowser();
  const context = await activeBrowser.newContext();
  const page = await context.newPage();

  if (env.ENABLE_RESOURCE_BLOCKING) {
    await page.route("**/*", (route) => handleRoute(route, options.blockImages ?? true));
  }

  try {
    return await callback(page);
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    releasePageSlot();
  }
}

function handleRoute(route: Route, blockImages: boolean): void {
  const request = route.request();
  const url = request.url();
  const type = request.resourceType();
  const shouldBlock =
    type === "font" ||
    type === "media" ||
    (blockImages && type === "image" && !url.includes("cci.betexplorer.com")) ||
    /google-analytics|googletagmanager|clarity|surveygizmo|doubleclick|facebook|adservice|advert/i.test(url);

  if (shouldBlock) {
    void route.abort();
    return;
  }
  void route.continue();
}

export function getBrowserStats() {
  return {
    running: Boolean(browser?.isConnected()),
    activePages,
    queuedPages: waiters.length,
  };
}

export async function shutdownBrowser(): Promise<void> {
  const active = browser;
  browser = null;
  if (active?.isConnected()) await active.close().catch(() => undefined);
}
