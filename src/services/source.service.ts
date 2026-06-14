import type { Page } from "playwright";
import { env } from "../config/env.js";
import { fetchHtml } from "../clients/http.client.js";
import { withPage } from "../clients/browser.client.js";
import { validateBetExplorerUrl } from "../utils/url.js";

export interface FetchSourceOptions {
  signal?: AbortSignal;
  onPage?: (page: Page) => Promise<void>;
  forceBrowser?: boolean;
  blockImages?: boolean;
}

export async function fetchSourceHtml(url: string, options?: FetchSourceOptions | AbortSignal): Promise<string> {
  const parsed = validateBetExplorerUrl(url);
  const normalized = normalizeOptions(options);
  if (normalized.forceBrowser || normalized.onPage) {
    return fetchWithBrowser(parsed.toString(), normalized);
  }
  try {
    return await fetchHtml(parsed.toString(), normalized.signal);
  } catch (error) {
    if (!env.ENABLE_PLAYWRIGHT_FALLBACK) throw error;
    return fetchWithBrowser(parsed.toString(), normalized);
  }
}

async function fetchWithBrowser(url: string, options: FetchSourceOptions): Promise<string> {
  return withPage(
    async (page: Page) => {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: env.SCRAPE_TIMEOUT_MS,
      });
      await options.onPage?.(page);
      return page.content();
    },
    { blockImages: options.blockImages ?? true },
  );
}

function normalizeOptions(options: FetchSourceOptions | AbortSignal | undefined): FetchSourceOptions {
  if (!options) return {};
  if ("aborted" in options && "addEventListener" in options) {
    return { signal: options };
  }
  return options;
}
