import { type Page } from "playwright";
export declare function withPage<T>(callback: (page: Page) => Promise<T>, options?: {
    blockImages?: boolean;
}): Promise<T>;
export declare function getBrowserStats(): {
    running: boolean;
    activePages: number;
    queuedPages: number;
};
export declare function shutdownBrowser(): Promise<void>;
//# sourceMappingURL=browser.client.d.ts.map