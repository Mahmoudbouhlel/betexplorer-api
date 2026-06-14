export async function measure(callback) {
    const started = performance.now();
    const value = await callback();
    return { value, ms: Math.round(performance.now() - started) };
}
export function elapsedMs(started) {
    return Math.round(performance.now() - started);
}
//# sourceMappingURL=timing.js.map