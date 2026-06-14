export async function measure<T>(callback: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const started = performance.now();
  const value = await callback();
  return { value, ms: Math.round(performance.now() - started) };
}

export function elapsedMs(started: number): number {
  return Math.round(performance.now() - started);
}
