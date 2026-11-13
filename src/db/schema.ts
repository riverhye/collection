import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { ENTRY_TYPES, type EntryMeta } from "@/domain/entry";

// `entries` is a placeholder name; rename once the app name is decided (PLAN §8).
export const entries = sqliteTable(
  "entries",
  {
    id: text().primaryKey(),
    title: text().notNull(),
    type: text({ enum: ENTRY_TYPES }).notNull().default("etc"),
    source: text(),
    url: text(),
    /** normalizeUrl(url), used as a strong identifier for dedup */
    normalizedUrl: text("normalized_url"),
    thumbnail: text(),
    memo: text(),
    favorite: integer({ mode: "boolean" }).notNull().default(false),
    meta: text({ mode: "json" }).$type<EntryMeta>(),
    experiencedDate: text("experienced_date"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("entries_created_at_idx").on(t.createdAt),
    index("entries_type_idx").on(t.type),
    index("entries_normalized_url_idx").on(t.normalizedUrl),
  ],
);

export const tags = sqliteTable("tags", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
});

export const entryTags = sqliteTable(
  "entry_tags",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.tagId] }), index("entry_tags_tag_idx").on(t.tagId)],
);
