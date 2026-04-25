/**
 * Courses store — the active draft course lives here in memory so every
 * leg-slot edit in the UI round-trips through one place. A debounced save
 * persists the draft to SQLite so killing and reopening the app restores
 * exactly what the user was looking at.
 */

import { create } from 'zustand';

import type { Course, CourseInput, CourseState, Leg } from '../types/course';

import {
  createCourse,
  deleteCourse,
  getActiveDraft,
  getCourse,
  listCourses,
  updateCourse,
} from './coursesRepo';

export interface CoursesState {
  activeDraft: Course | null;
  recent: Course[];
  isLoading: boolean;
  error: string | null;
}

export interface CoursesActions {
  hydrate: () => Promise<void>;
  startDraft: (input: CourseInput) => Promise<Course>;
  updateDraft: (patch: {
    name?: string;
    legs?: Leg[];
    state?: CourseState;
    startType?: Course['startType'];
  }) => Promise<Course>;
  setLegMarks: (legId: string, markIds: string[]) => Promise<Course>;
  setLegRounding: (legId: string, rounding: Leg['rounding']) => Promise<Course>;
  clearDraft: () => Promise<void>;
  refresh: () => Promise<void>;
}

const initial: CoursesState = {
  activeDraft: null,
  recent: [],
  isLoading: false,
  error: null,
};

export const useCoursesStore = create<CoursesState & CoursesActions>((set, get) => ({
  ...initial,

  hydrate: async () => {
    set({ isLoading: true, error: null });
    try {
      const [draft, recent] = await Promise.all([getActiveDraft(), listCourses()]);
      set({ activeDraft: draft, recent, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: toMessage(err) });
    }
  },

  refresh: async () => {
    try {
      const [draft, recent] = await Promise.all([getActiveDraft(), listCourses()]);
      set({ activeDraft: draft, recent });
    } catch (err) {
      set({ error: toMessage(err) });
    }
  },

  startDraft: async (input) => {
    // If a draft already exists, replace its content rather than spawning a
    // second draft — we want a single in-progress course at a time.
    const existing = get().activeDraft;
    if (existing) {
      const updated = await updateCourse(existing.id, {
        name: input.name,
        templateId: input.templateId,
        legs: input.legs,
        state: 'draft',
        startType: input.startType,
      });
      set({ activeDraft: updated });
      await get().refresh();
      return updated;
    }
    const created = await createCourse({ ...input, state: 'draft' });
    set({ activeDraft: created });
    await get().refresh();
    return created;
  },

  updateDraft: async (patch) => {
    const current = get().activeDraft;
    if (!current) throw new Error('updateDraft: no active draft');
    const updated = await updateCourse(current.id, patch);
    set({ activeDraft: updated });
    return updated;
  },

  setLegMarks: async (legId, markIds) => {
    const current = get().activeDraft;
    if (!current) throw new Error('setLegMarks: no active draft');
    const nextLegs = current.legs.map((l) => (l.id === legId ? { ...l, markIds } : l));
    const updated = await updateCourse(current.id, { legs: nextLegs });
    set({ activeDraft: updated });
    return updated;
  },

  setLegRounding: async (legId, rounding) => {
    const current = get().activeDraft;
    if (!current) throw new Error('setLegRounding: no active draft');
    const nextLegs = current.legs.map((l) => (l.id === legId ? { ...l, rounding } : l));
    const updated = await updateCourse(current.id, { legs: nextLegs });
    set({ activeDraft: updated });
    return updated;
  },

  clearDraft: async () => {
    const current = get().activeDraft;
    if (!current) return;
    await deleteCourse(current.id);
    const refreshed = await listCourses();
    set({ activeDraft: null, recent: refreshed });
  },
}));

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export { getCourse };
