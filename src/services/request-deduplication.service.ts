export const activeMatchLists = new Map<string, Promise<unknown>>();
export const activeDetails = new Map<string, Promise<unknown>>();
export const activeStandings = new Map<string, Promise<unknown>>();
export const activeH2H = new Map<string, Promise<unknown>>();
export const activeRecentResults = new Map<string, Promise<unknown>>();
export const activeFullMatches = new Map<string, Promise<unknown>>();
export const activeTeamResults = new Map<string, Promise<unknown>>();
export const activeTeamFixtures = new Map<string, Promise<unknown>>();
export const activeTeamProfiles = new Map<string, Promise<unknown>>();
export const activeMatchTeams = new Map<string, Promise<unknown>>();

export function dedupe<T>(map: Map<string, Promise<unknown>>, key: string, factory: () => Promise<T>): Promise<T> {
  const active = map.get(key);
  if (active) return active as Promise<T>;
  const promise = factory();
  map.set(key, promise);
  return promise.finally(() => {
    map.delete(key);
  });
}
