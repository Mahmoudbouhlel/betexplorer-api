export declare function measure<T>(callback: () => Promise<T>): Promise<{
    value: T;
    ms: number;
}>;
export declare function elapsedMs(started: number): number;
//# sourceMappingURL=timing.d.ts.map