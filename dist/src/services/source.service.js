import { env } from "../config/env.js";
import { fetchHtml } from "../clients/http.client.js";
import { withPage } from "../clients/browser.client.js";
import { validateBetExplorerUrl } from "../utils/url.js";
export async function fetchSourceHtml(url, options) {
    const parsed = validateBetExplorerUrl(url);
    const normalized = normalizeOptions(options);
    if (normalized.forceBrowser || normalized.onPage) {
        return fetchWithBrowser(parsed.toString(), normalized);
    }
    try {
        return await fetchHtml(parsed.toString(), normalized.signal);
    }
    catch (error) {
        if (!env.ENABLE_PLAYWRIGHT_FALLBACK)
            throw error;
        return fetchWithBrowser(parsed.toString(), normalized);
    }
}
async function fetchWithBrowser(url, options) {
    return withPage(async (page) => {
        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: env.SCRAPE_TIMEOUT_MS,
        });
        await options.onPage?.(page);
        return page.content();
    }, { blockImages: options.blockImages ?? true });
}
function normalizeOptions(options) {
    if (!options)
        return {};
    if ("aborted" in options && "addEventListener" in options) {
        return { signal: options };
    }
    return options;
}
//# sourceMappingURL=source.service.js.map