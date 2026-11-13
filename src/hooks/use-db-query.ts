import { addDatabaseChangeListener } from "expo-sqlite";
import { useMemo, useSyncExternalStore } from "react";

// Bumped on every write to any table, so queries that join tags refresh too
// (drizzle's useLiveQuery only watches the query's main table).
let version = 0;
const listeners = new Set<() => void>();

addDatabaseChangeListener(() => {
  version++;
  listeners.forEach((notify) => notify());
});

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

/**
 * Runs a synchronous DB query and re-runs it whenever the database changes or `query` changes.
 * React Compiler memoizes inline closures by what they capture, so `useDbQuery(() => getEntry(id))`
 * only re-queries when `id` changes or the DB is written.
 */
export function useDbQuery<T>(query: () => T): T {
  // Opt out of React Compiler: it re-derives memo deps from the body and would drop dbVersion.
  "use no memo";
  const dbVersion = useSyncExternalStore(subscribe, () => version);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- dbVersion is the refresh trigger
  return useMemo(() => query(), [query, dbVersion]);
}
