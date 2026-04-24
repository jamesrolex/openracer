/**
 * Marks store — an in-memory cache of the marks library backed by the repo.
 *
 * The repo (marksRepo.ts) is the source of truth. This store wraps it so
 * React screens can subscribe without re-querying SQLite on every render,
 * and so a single mutation triggers one refresh for every subscriber.
 *
 * The store does NOT persist — SQLite already does. It just caches the last
 * list read and exposes actions that proxy to the repo then reload.
 */

import { create } from 'zustand';

import type { Mark, MarkInput } from '../types/mark';

import {
  createMark,
  deleteMark,
  listMarks,
  purgeExpiredMarks,
  updateMark,
  type MarkListFilter,
} from './marksRepo';

export interface MarksState {
  marks: Mark[];
  isLoading: boolean;
  error: string | null;
}

export interface MarksActions {
  refresh: (filter?: MarkListFilter) => Promise<void>;
  create: (input: MarkInput) => Promise<Mark>;
  update: (id: string, patch: Partial<MarkInput>) => Promise<Mark>;
  remove: (id: string) => Promise<void>;
  purgeExpired: () => Promise<number>;
}

const initial: MarksState = {
  marks: [],
  isLoading: false,
  error: null,
};

export const useMarksStore = create<MarksState & MarksActions>((set, get) => ({
  ...initial,

  refresh: async (filter) => {
    set({ isLoading: true, error: null });
    try {
      const marks = await listMarks(filter);
      set({ marks, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: toMessage(err) });
    }
  },

  create: async (input) => {
    const mark = await createMark(input);
    await get().refresh();
    return mark;
  },

  update: async (id, patch) => {
    const mark = await updateMark(id, patch);
    await get().refresh();
    return mark;
  },

  remove: async (id) => {
    await deleteMark(id);
    await get().refresh();
  },

  purgeExpired: async () => {
    const removed = await purgeExpiredMarks();
    if (removed > 0) await get().refresh();
    return removed;
  },
}));

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
