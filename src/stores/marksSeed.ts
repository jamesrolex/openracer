/**
 * First-launch seeder — if the marks table is empty, insert the bundled
 * Abersoch fixture so the Mark Library isn't a blank screen on boot.
 *
 * Idempotent: once a mark has been written, we never seed again, so a
 * sailor who deletes every seeded mark gets to keep their library empty.
 */

import abersochSeed from '../../assets/seeds/abersoch-marks.json';
import { defaultValidityFor } from '../domain/markLifecycle';
import type { MarkIcon, MarkInput, MarkShape, MarkSource, MarkTier } from '../types/mark';

import { getDb } from './db';
import { createMark, listMarks } from './marksRepo';

interface SeedEntry {
  name: string;
  latitude: number;
  longitude: number;
  tier: MarkTier;
  source: MarkSource;
  icon: MarkIcon;
  shape: MarkShape;
  owner: string;
  notes?: string;
}

interface SeedFile {
  comment?: string;
  marks: SeedEntry[];
}

const SEED_DONE_KEY = 'marks.seed.completed';

async function seedFlagSet(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM kv_store WHERE key = ?;`,
    SEED_DONE_KEY,
  );
  return !!row;
}

async function setSeedFlag(): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO kv_store (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    SEED_DONE_KEY,
    JSON.stringify({ at: new Date().toISOString() }),
  );
}

export async function seedMarksIfEmpty(now: Date = new Date()): Promise<number> {
  if (await seedFlagSet()) return 0;

  // Second-chance check — if the user manually created marks before this ran,
  // skip the seed entirely. The flag covers the normal case; this covers a
  // future migration where the flag might be missing.
  const existing = await listMarks({}, now);
  if (existing.length > 0) {
    await setSeedFlag();
    return 0;
  }

  const file = abersochSeed as SeedFile;
  let inserted = 0;
  for (const entry of file.marks) {
    const validity = defaultValidityFor(entry.tier, now);
    const input: MarkInput = {
      name: entry.name,
      latitude: entry.latitude,
      longitude: entry.longitude,
      tier: entry.tier,
      source: entry.source,
      icon: entry.icon,
      shape: entry.shape,
      validFrom: validity.validFrom,
      validUntil: validity.validUntil,
      owner: entry.owner,
      notes: entry.notes,
    };
    await createMark(input, now);
    inserted += 1;
  }
  await setSeedFlag();
  return inserted;
}
