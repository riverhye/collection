import type { SearchResult, SourceAdapter } from "@/adapters/types";
import { parsePageMeta } from "@/domain/og";

/** Naver's desktop blog wraps posts in an iframe; the mobile page has the real metadata. */
function fetchableUrl(url: string) {
  return url.replace(/^https?:\/\/blog\.naver\.com\//, "https://m.blog.naver.com/");
}

/**
 * Reads a page's Open Graph tags directly from the device. Native fetch has no CORS limits, so this
 * works for most sites; SPAs without server-rendered tags or bot-blocking sites fall back to manual entry.
 */
export const articleAdapter: SourceAdapter = {
  async lookup(url) {
    const res = await fetch(fetchableUrl(url), { headers: { Accept: "text/html" } });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) return null;
    const page = parsePageMeta(await res.text(), res.url || url);
    if (!page.title) return null;
    return {
      externalId: url,
      title: page.title,
      subtitle: page.siteName ?? new URL(url).hostname,
      thumbnail: page.image,
      url,
      meta: {
        siteName: page.siteName ?? undefined,
        author: page.author ?? undefined,
        publishedAt: page.publishedAt ?? undefined,
        summary: page.description ?? undefined,
      },
    } satisfies SearchResult;
  },
};
