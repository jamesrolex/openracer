/**
 * Persistence for courses, legs, and leg-mark assignments. Courses are
 * stored across three tables (courses, course_legs, course_leg_marks) and
 * this module is the only thing that knows the shape.
 *
 * Every mutation runs inside a transaction so an interrupted save never
 * leaves a half-written course on disk — the "kill the app mid-edit and
 * reopen" scenario must restore exactly what the user saw.
 */

import type { Course, CourseInput, CourseState, CourseTemplateId, Leg } from '../types/course';
import type { IsoTimestamp } from '../types/signalk';

import { getDb } from './db';

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

interface CourseRow {
  id: string;
  name: string;
  template_id: string;
  state: string;
  start_type: string | null;
  created_at: string;
  updated_at: string;
}

interface LegRow {
  id: string;
  course_id: string;
  position: number;
  type: string;
  label: string;
  required_marks: number;
  rounding: string | null;
}

interface LegMarkRow {
  leg_id: string;
  mark_id: string;
  position: number;
}

async function loadCourseFromRow(row: CourseRow): Promise<Course> {
  const db = await getDb();
  const legRows = await db.getAllAsync<LegRow>(
    `SELECT * FROM course_legs WHERE course_id = ? ORDER BY position ASC;`,
    row.id,
  );
  const legIds = legRows.map((l) => l.id);
  const markRows = legIds.length
    ? await db.getAllAsync<LegMarkRow>(
        `SELECT * FROM course_leg_marks WHERE leg_id IN (${legIds.map(() => '?').join(',')}) ORDER BY position ASC;`,
        ...legIds,
      )
    : [];

  const marksByLeg = new Map<string, string[]>();
  for (const m of markRows) {
    const list = marksByLeg.get(m.leg_id) ?? [];
    list.push(m.mark_id);
    marksByLeg.set(m.leg_id, list);
  }

  const legs: Leg[] = legRows.map((l) => ({
    id: l.id,
    type: l.type as Leg['type'],
    label: l.label,
    markIds: marksByLeg.get(l.id) ?? [],
    requiredMarks: l.required_marks,
    rounding: (l.rounding as Leg['rounding']) ?? null,
  }));

  return {
    id: row.id,
    name: row.name,
    templateId: row.template_id as CourseTemplateId,
    legs,
    state: row.state as CourseState,
    startType: (row.start_type as Course['startType']) ?? 'standard-line',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCourse(id: string): Promise<Course | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<CourseRow>(`SELECT * FROM courses WHERE id = ?;`, id);
  return row ? loadCourseFromRow(row) : null;
}

export async function listCourses(state?: CourseState): Promise<Course[]> {
  const db = await getDb();
  const rows = state
    ? await db.getAllAsync<CourseRow>(
        `SELECT * FROM courses WHERE state = ? ORDER BY updated_at DESC;`,
        state,
      )
    : await db.getAllAsync<CourseRow>(`SELECT * FROM courses ORDER BY updated_at DESC;`);
  const out: Course[] = [];
  for (const r of rows) out.push(await loadCourseFromRow(r));
  return out;
}

export async function getActiveDraft(): Promise<Course | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<CourseRow>(
    `SELECT * FROM courses WHERE state = 'draft' ORDER BY updated_at DESC LIMIT 1;`,
  );
  return row ? loadCourseFromRow(row) : null;
}

export async function createCourse(input: CourseInput, now: Date = new Date()): Promise<Course> {
  const db = await getDb();
  const id = newId('course');
  const nowIso: IsoTimestamp = now.toISOString();
  const state: CourseState = input.state ?? 'draft';
  const startType = input.startType ?? 'standard-line';

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO courses (id, name, template_id, state, start_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      id,
      input.name,
      input.templateId,
      state,
      startType,
      nowIso,
      nowIso,
    );
    for (let i = 0; i < input.legs.length; i += 1) {
      const leg = input.legs[i]!;
      await db.runAsync(
        `INSERT INTO course_legs (id, course_id, position, type, label, required_marks, rounding)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        leg.id,
        id,
        i,
        leg.type,
        leg.label,
        leg.requiredMarks,
        leg.rounding,
      );
      for (let j = 0; j < leg.markIds.length; j += 1) {
        await db.runAsync(
          `INSERT INTO course_leg_marks (leg_id, mark_id, position) VALUES (?, ?, ?);`,
          leg.id,
          leg.markIds[j]!,
          j,
        );
      }
    }
  });

  const created = await getCourse(id);
  if (!created) throw new Error(`createCourse: row ${id} vanished after insert`);
  return created;
}

export async function updateCourse(
  id: string,
  patch: {
    name?: string;
    templateId?: CourseTemplateId;
    state?: CourseState;
    startType?: Course['startType'];
    legs?: Leg[];
  },
  now: Date = new Date(),
): Promise<Course> {
  const db = await getDb();
  const existing = await getCourse(id);
  if (!existing) throw new Error(`updateCourse: no course with id ${id}`);

  const next: Course = {
    ...existing,
    name: patch.name ?? existing.name,
    templateId: patch.templateId ?? existing.templateId,
    state: patch.state ?? existing.state,
    startType: patch.startType ?? existing.startType,
    legs: patch.legs ?? existing.legs,
    updatedAt: now.toISOString(),
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE courses SET name = ?, template_id = ?, state = ?, start_type = ?, updated_at = ? WHERE id = ?;`,
      next.name,
      next.templateId,
      next.state,
      next.startType,
      next.updatedAt,
      id,
    );
    if (patch.legs) {
      // Replace legs wholesale. Simpler than diffing and fast enough for
      // the ~5 leg upper bound on realistic courses.
      await db.runAsync(`DELETE FROM course_legs WHERE course_id = ?;`, id);
      for (let i = 0; i < next.legs.length; i += 1) {
        const leg = next.legs[i]!;
        await db.runAsync(
          `INSERT INTO course_legs (id, course_id, position, type, label, required_marks, rounding)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          leg.id,
          id,
          i,
          leg.type,
          leg.label,
          leg.requiredMarks,
          leg.rounding,
        );
        for (let j = 0; j < leg.markIds.length; j += 1) {
          await db.runAsync(
            `INSERT INTO course_leg_marks (leg_id, mark_id, position) VALUES (?, ?, ?);`,
            leg.id,
            leg.markIds[j]!,
            j,
          );
        }
      }
    }
  });

  const updated = await getCourse(id);
  if (!updated) throw new Error(`updateCourse: row ${id} vanished after update`);
  return updated;
}

export async function deleteCourse(id: string): Promise<void> {
  const db = await getDb();
  // course_legs cascade on course delete; course_leg_marks cascade on leg
  // delete via the FK schema set up in migrations.ts.
  await db.runAsync(`DELETE FROM courses WHERE id = ?;`, id);
}
