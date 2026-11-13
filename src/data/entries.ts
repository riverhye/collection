import * as Crypto from "expo-crypto";
import { and, desc, eq, exists, inArray, ne, notInArray, or, sql, type SQL } from "drizzle-orm";

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
};

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
}

export function setFavorite(id: string, favorite: boolean) {
  db.update(entries).set({ favorite, updatedAt: new Date() }).where(eq(entries.id, id)).run();
}

export function deleteEntry(id: string) {
  db.transaction((tx) => {
    tx.delete(entries).where(eq(entries.id, id)).run();
    setEntryTags(tx, id, []);
  });
}
