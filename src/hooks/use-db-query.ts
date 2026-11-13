import { useMemo, useSyncExternalStore } from "react";

import { getDbVersion, subscribeDbChanges } from "@/db/changes";

/**
 * Runs a synchronous DB query and re-runs it whenever the repository writes or `query` changes.
 * React Compiler memoizes inline closures by what they capture, so `useDbQuery(() => getEntry(id))`
 * only re-queries when `id` changes or the DB is written.
 */
export function useDbQuery<T>(query: () => T): T {
  // Opt out of React Compiler: it re-derives memo deps from the body and would drop dbVersion.
  "use no memo";
  const dbVersion = useSyncExternalStore(subscribeDbChanges, getDbVersion);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- dbVersion is the refresh trigger
  return useMemo(() => query(), [query, dbVersion]);
}
