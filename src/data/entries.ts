import * as Crypto from "expo-crypto";
import { and, desc, eq, exists, inArray, ne, notInArray, or, sql, type SQL } from "drizzle-orm";

import { notifyDbChanged } from "@/db/changes";
import { db } from "@/db/client";
import { entries, entryTags, tags } from "@/db/schema";
import {
  normalizeUrl,
  type Entry,
  type EntryInput,
  type EntryType,
  type EntryWithTags,
} from "@/domain/entry";

export type EntryFilter = {
  search?: string;
  type?: EntryType | null;
  favoriteOnly?: boolean;
  tagNames?: string[];
  /** "and": entry has every selected tag (default). "or": entry has at least one. */
  tagMode?: "and" | "or";
  /** Inclusive YYYY-MM-DD range on 본 날, falling back to the day it was added when 본 날 is empty. */
  dateFrom?: string | null;
  dateTo?: string | null;
  /** Entry has any of these genres (meta.genres from TMDB). */
  genres?: string[];
};

/** 본 날, or the local day it was added (PLAN §2: experienced_date falls back to created_at). */
const effectiveDate = sql`coalesce(${entries.experiencedDate}, date(${entries.createdAt} / 1000, 'unixepoch', 'localtime'))`;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function likePattern(term: string) {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function hasTag(condition: SQL) {
  return exists(
    db
      .select({ one: sql`1` })
      .from(entryTags)
      .innerJoin(tags, eq(tags.id, entryTags.tagId))
      .where(and(eq(entryTags.entryId, entries.id), condition)),
  );
}

function withTags(rows: Entry[]): EntryWithTags[] {
  if (rows.length === 0) return [];
  const pairs = db
    .select({ entryId: entryTags.entryId, name: tags.name })
    .from(entryTags)
    .innerJoin(tags, eq(tags.id, entryTags.tagId))
    .where(inArray(entryTags.entryId, rows.map((r) => r.id)))
    .orderBy(tags.name)
    .all();
  const byEntry = new Map<string, string[]>();
  for (const { entryId, name } of pairs) {
    byEntry.set(entryId, [...(byEntry.get(entryId) ?? []), name]);
  }
  return rows.map((r) => ({ ...r, tags: byEntry.get(r.id) ?? [] }));
}

function toEntry(row: typeof entries.$inferSelect): Entry {
  const { normalizedUrl: _, ...entry } = row;
  return entry;
}

export function listEntries(filter: EntryFilter = {}): EntryWithTags[] {
  const conditions: SQL[] = [];

  const term = filter.search?.trim();
  if (term) {
    const pattern = likePattern(term);
    conditions.push(
      or(
        sql`${entries.title} LIKE ${pattern} ESCAPE '\\'`,
        sql`${entries.memo} LIKE ${pattern} ESCAPE '\\'`,
        hasTag(sql`${tags.name} LIKE ${pattern} ESCAPE '\\'`),
      )!,
    );
  }
  if (filter.type) conditions.push(eq(entries.type, filter.type));
  if (filter.favoriteOnly) conditions.push(eq(entries.favorite, true));

  if (filter.dateFrom) conditions.push(sql`${effectiveDate} >= ${filter.dateFrom}`);
  if (filter.dateTo) conditions.push(sql`${effectiveDate} <= ${filter.dateTo}`);

  const genres = filter.genres ?? [];
  if (genres.length > 0) {
    const list = sql.join(
      genres.map((g) => sql`${g}`),
      sql`, `,
    );
    conditions.push(sql`exists (select 1 from json_each(${entries.meta}, '$.genres') where value in (${list}))`);
  }

  const tagNames = filter.tagNames ?? [];
  if (tagNames.length > 0) {
    if (filter.tagMode === "or") {
      conditions.push(hasTag(inArray(tags.name, tagNames)));
    } else {
      for (const name of tagNames) conditions.push(hasTag(eq(tags.name, name)));
    }
  }

  const rows = db
    .select()
    .from(entries)
    .where(and(...conditions))
    .orderBy(desc(entries.createdAt))
    .all();
  return withTags(rows.map(toEntry));
}

export function getEntry(id: string): EntryWithTags | null {
  const row = db.select().from(entries).where(eq(entries.id, id)).get();
  return row ? withTags([toEntry(row)])[0] : null;
}

/** Strong-identifier dedup: an existing entry with the same normalized URL. */
export function findByUrl(url: string | null | undefined): Entry | null {
  const normalized = url ? normalizeUrl(url) : null;
  if (!normalized) return null;
  const row = db.select().from(entries).where(eq(entries.normalizedUrl, normalized)).get();
  return row ? toEntry(row) : null;
}

/** Strong-identifier dedup by external ID stored in meta (tmdbId / isbn / videoId). */
export function findByExternalId(type: EntryType, key: string, value: unknown): Entry | null {
  if (value == null || value === "") return null;
  const row = db
    .select()
    .from(entries)
    .where(and(eq(entries.type, type), sql`json_extract(${entries.meta}, ${`$.${key}`}) = ${value}`))
    .get();
  return row ? toEntry(row) : null;
}

/** Weak dedup hint: entries whose title matches ignoring case and surrounding spaces. */
export function findSameTitle(title: string, excludeId?: string): Entry[] {
  const key = title.trim().toLowerCase();
  if (!key) return [];
  const conditions = [sql`lower(trim(${entries.title})) = ${key}`];
  if (excludeId) conditions.push(ne(entries.id, excludeId));
  return db
    .select()
    .from(entries)
    .where(and(...conditions))
    .orderBy(desc(entries.createdAt))
    .all()
    .map(toEntry);
}

/** Genres across movies and TV (meta.genres), most common first. */
export function listGenres(): { name: string; count: number }[] {
  return db.all<{ name: string; count: number }>(
    sql`select g.value as name, count(*) as count from ${entries}, json_each(${entries.meta}, '$.genres') g group by g.value order by count desc, name`,
  );
}

export function listTags(): { name: string; count: number }[] {
  return db
    .select({ name: tags.name, count: sql<number>`count(${entryTags.entryId})` })
    .from(tags)
    .innerJoin(entryTags, eq(entryTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(desc(sql`count(${entryTags.entryId})`), tags.name)
    .all();
}

function setEntryTags(tx: Tx, entryId: string, names: string[]) {
  tx.delete(entryTags).where(eq(entryTags.entryId, entryId)).run();
  if (names.length > 0) {
    tx.insert(tags)
      .values(names.map((name) => ({ name })))
      .onConflictDoNothing()
      .run();
    const ids = tx.select({ id: tags.id }).from(tags).where(inArray(tags.name, names)).all();
    tx.insert(entryTags)
      .values(ids.map(({ id }) => ({ entryId, tagId: id })))
      .run();
  }
  // Drop tags no entry uses anymore so autocomplete/filter chips stay clean.
  tx.delete(tags)
    .where(notInArray(tags.id, tx.select({ id: entryTags.tagId }).from(entryTags)))
    .run();
}

function columnsFrom(input: Partial<EntryInput>) {
  const { tags: _, ...rest } = input;
  return {
    ...rest,
    ...(input.title !== undefined && { title: input.title.trim() }),
    ...(input.url !== undefined && {
      url: input.url?.trim() || null,
      normalizedUrl: input.url ? normalizeUrl(input.url) : null,
    }),
  };
}

export function createEntry(input: EntryInput): string {
  const id = Crypto.randomUUID();
  const now = new Date();
  db.transaction((tx) => {
    tx.insert(entries)
      .values({ ...columnsFrom(input), title: input.title.trim(), id, createdAt: now, updatedAt: now })
      .run();
    setEntryTags(tx, id, input.tags ?? []);
  });
  notifyDbChanged();
  return id;
}

export function updateEntry(id: string, input: Partial<EntryInput>) {
  db.transaction((tx) => {
    tx.update(entries)
      .set({ ...columnsFrom(input), updatedAt: new Date() })
      .where(eq(entries.id, id))
      .run();
    if (input.tags) setEntryTags(tx, id, input.tags);
  });
  notifyDbChanged();
}

export function setFavorite(id: string, favorite: boolean) {
  db.update(entries).set({ favorite, updatedAt: new Date() }).where(eq(entries.id, id)).run();
  notifyDbChanged();
}

export function deleteEntry(id: string) {
  db.transaction((tx) => {
    tx.delete(entries).where(eq(entries.id, id)).run();
    setEntryTags(tx, id, []);
  });
  notifyDbChanged();
}

export type ImportResult = { added: number; updated: number; skipped: number };

/**
 * Restores entries from a backup by ID. New IDs are added; for existing ones the more recently
 * updated version wins, so importing an old backup never overwrites newer edits.
 */
export function importEntries(items: EntryWithTags[]): ImportResult {
  const result: ImportResult = { added: 0, updated: 0, skipped: 0 };
  db.transaction((tx) => {
    for (const { tags: tagNames, ...item } of items) {
      const existing = tx.select({ updatedAt: entries.updatedAt }).from(entries).where(eq(entries.id, item.id)).get();
      const columns = { ...item, normalizedUrl: item.url ? normalizeUrl(item.url) : null };
      if (!existing) {
        tx.insert(entries).values(columns).run();
        result.added++;
      } else if (item.updatedAt > existing.updatedAt) {
        tx.update(entries).set(columns).where(eq(entries.id, item.id)).run();
        result.updated++;
      } else {
        result.skipped++;
        continue;
      }
      setEntryTags(tx, item.id, tagNames);
    }
  });
  notifyDbChanged();
  return result;
}
