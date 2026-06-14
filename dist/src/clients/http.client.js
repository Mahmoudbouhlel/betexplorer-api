import { env } from "../config/env.js";
import { recordHttpRequest } from "../services/performance.service.js";
import { elapsedMs } from "../utils/timing.js";
const transientStatuses = new Set([502, 503, 504]);
export class HttpFetchError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
export async function fetchHtml(url, signal) {
    const started = performance.now();
    try {
        return await fetchHtmlAttempt(url, signal, true);
    }
    finally {
        recordHttpRequest(elapsedMs(started));
    }
}
async function fetchHtmlAttempt(url, signal, canRetry) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.REQUEST_TIMEOUT_MS);
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    try {
        const response = await fetch(url, {
            redirect: "follow",
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });
        if (!response.ok) {
            if (canRetry && transientStatuses.has(response.status)) {
                return fetchHtmlAttempt(url, signal, false);
            }
            throw new HttpFetchError(`BetExplorer returned HTTP ${response.status}`, response.status);
        }
        return await response.text();
    }
    catch (error) {
        if (error instanceof HttpFetchError)
            throw error;
        const message = error instanceof Error && error.name === "AbortError" ? "BETEXPLORER_TIMEOUT" : "BETEXPLORER_BLOCKED";
        throw new HttpFetchError(message, null);
    }
    finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abort);
    }
}
//# sourceMappingURL=http.client.js.map