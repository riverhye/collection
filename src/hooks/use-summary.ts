import { useEffect, useState } from "react";

import { getAdapter } from "@/adapters/registry";
import type { EntryWithTags } from "@/domain/entry";

/**
 * Summary shown on the detail screen. Articles store theirs; other types fetch it by external ID
 * each time (null while loading, offline, or when the source has none).
 */
export function useSummary(entry: EntryWithTags | null): string | null {
  const meta = (entry?.meta ?? {}) as Record<string, unknown>;
  const stored = typeof meta.summary === "string" ? meta.summary : null;
  const adapter = entry ? getAdapter(entry.type) : undefined;
  // Stable key so the effect re-runs only when the meta content changes, not on every DB refresh.
  const metaKey = JSON.stringify(entry?.meta ?? null);
  const [fetched, setFetched] = useState<{ key: string; summary: string | null } | null>(null);

  useEffect(() => {
    if (stored || !adapter?.summary) return;
    const controller = new AbortController();
    adapter
      .summary(JSON.parse(metaKey) ?? {}, controller.signal)
      .then((summary) => setFetched({ key: metaKey, summary }))
      .catch(() => {});
    return () => controller.abort();
  }, [adapter, metaKey, stored]);

  return stored ?? (fetched?.key === metaKey ? fetched.summary : null);
}
