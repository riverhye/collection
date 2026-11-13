// Open Graph / HTML metadata parsing for article links. No React Native imports here.

export type PageMeta = {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  author: string | null;
  publishedAt: string | null;
};

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function attributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    attrs[m[1].toLowerCase()] = m[3] ?? m[4] ?? "";
  }
  return attrs;
}

/** Reads og:* / twitter:* / standard meta tags and <title>; attribute order doesn't matter. */
export function parsePageMeta(html: string, pageUrl: string): PageMeta {
  const head = html.slice(0, 300_000);
  const meta = new Map<string, string>();
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attributes(tag);
    const key = (a.property ?? a.name ?? a.itemprop)?.toLowerCase();
    const value = a.content?.trim();
    if (key && value && !meta.has(key)) meta.set(key, decodeHtmlEntities(value));
  }
  const first = (...keys: string[]) => keys.map((k) => meta.get(k)).find(Boolean) ?? null;
  const titleTag = /<title[^>]*>([^<]*)<\/title>/i.exec(head)?.[1];

  let image = first("og:image", "og:image:url", "og:image:secure_url", "twitter:image", "twitter:image:src");
  if (image) {
    try {
      image = new URL(image, pageUrl).toString();
    } catch {
      image = null;
    }
  }
  const published = first("article:published_time", "og:article:published_time", "datepublished", "date", "pubdate");

  return {
    title: first("og:title", "twitter:title") ?? (titleTag ? decodeHtmlEntities(titleTag).trim() || null : null),
    description: first("og:description", "twitter:description", "description"),
    image,
    siteName: first("og:site_name", "application-name"),
    author: first("article:author", "author", "og:article:author", "byl"),
    publishedAt: published && /^\d{4}-\d{2}-\d{2}/.test(published) ? published.slice(0, 10) : null,
  };
}
