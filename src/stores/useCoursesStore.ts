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
  /** Clone a saved course into a new active draft. Replaces any existing
   *  draft. If `keepMarks=false`, mark assignments are cleared so the
   *  sailor picks fresh marks for today's race. */
  cloneAsDraft: (id: string, opts?: { keepMarks?: boolean; rename?: string }) => Promise<Course>;
  /** Rename a saved course (any state). */
  renameCourse: (id: string, name: string) => Promise<Course>;
  /** Delete a saved course outright. Pass the active-draft id to clear
   *  the draft as a side effect. */
  removeCourse: (id: string) => Promise<void>;
  /** Archive the current draft (stops it being the active draft) without
   *  deleting it. Used pre-arm so the draft is preserved for re-arm. */
  archiveDraft: () => Promise<Course | null>;
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

  cloneAsDraft: async (id, opts = {}) => {
    const source = await getCourse(id);
    if (!source) throw new Error(`cloneAsDraft: no course ${id}`);

    const keepMarks = opts.keepMarks ?? true;
    // Replace any existing draft so we never end up with two.
    const existing = get().activeDraft;
    if (existing) await deleteCourse(existing.id);

    // Clone legs with fresh ids so the new draft owns them. If `keepMarks`
    // is false, mark assignments are dropped so the sailor picks fresh.
    const clonedLegs: Leg[] = source.legs.map((l) => ({
      id: `leg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      type: l.type,
      label: l.label,
      requiredMarks: l.requiredMarks,
      rounding: l.rounding,
      markIds: keepMarks ? [...l.markIds] : [],
    }));

    const draftName = opts.rename ?? source.name;
    const created = await createCourse({
      name: draftName,
      templateId: source.templateId,
      legs: clonedLegs,
      state: 'draft',
      startType: source.startType,
    });
    set({ activeDraft: created });
    await get().refresh();
    return created;
  },

  renameCourse: async (id, name) => {
    const updated = await updateCourse(id, { name });
    const draft = get().activeDraft;
    if (draft && draft.id === id) set({ activeDraft: updated });
    await get().refresh();
    return updated;
  },

  removeCourse: async (id) => {
    await deleteCourse(id);
    const draft = get().activeDraft;
    const refreshed = await listCourses();
    set({
      activeDraft: draft && draft.id === id ? null : draft,
      recent: refreshed,
    });
  },

  archiveDraft: async () => {
    const current = get().activeDraft;
    if (!current) return null;
    const archived = await updateCourse(current.id, { state: 'archived' });
    set({ activeDraft: null });
    await get().refresh();
    return archived;
  },
}));

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export { getCourse };
