import type { Page } from "playwright";
export interface FetchSourceOptions {
    signal?: AbortSignal;
    onPage?: (page: Page) => Promise<void>;
    forceBrowser?: boolean;
    blockImages?: boolean;
}
export declare function fetchSourceHtml(url: string, options?: FetchSourceOptions | AbortSignal): Promise<string>;
//# sourceMappingURL=source.service.d.ts.map