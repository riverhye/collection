import { useEffect, useState } from "react";

import { getAdapter } from "@/adapters/registry";
import type { SearchResult } from "@/adapters/types";
import type { EntryType } from "@/domain/entry";

export type ResultGroup = { type: EntryType; results: SearchResult[]; error: string | null };

type Fetched = { key: string; term: string; groups: ResultGroup[] };

/**
 * Debounced (300ms) live search across one or more types in parallel; aborts in-flight requests
 * when the query changes. While a new query loads, previous results for the same types stay visible.
 */
export function useExternalSearch(types: EntryType[], query: string, enabled: boolean) {
  const key = types.filter((t) => getAdapter(t)).join(",");
  const term = query.trim();
  const active = enabled && key !== "" && term !== "";
  const [fetched, setFetched] = useState<Fetched | null>(null);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const searches = (key.split(",") as EntryType[]).map((type) =>
        getAdapter(type)!
          .search(term, controller.signal)
          .then(
            (results): ResultGroup => ({ type, results, error: null }),
            (e: Error): ResultGroup => ({ type, results: [], error: e.message }),
          ),
      );
      Promise.all(searches).then((groups) => {
        if (!controller.signal.aborted) setFetched({ key, term, groups });
      });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, key, term]);

  if (!active) return { groups: [] as ResultGroup[], loading: false };
  const sameTypes = fetched?.key === key;
  return {
    groups: sameTypes ? fetched.groups : [],
    loading: !(sameTypes && fetched.term === term),
  };
}
