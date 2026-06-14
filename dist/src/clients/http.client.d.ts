export declare class HttpFetchError extends Error {
    readonly statusCode: number | null;
    constructor(message: string, statusCode: number | null);
}
export declare function fetchHtml(url: string, signal?: AbortSignal): Promise<string>;
//# sourceMappingURL=http.client.d.ts.map