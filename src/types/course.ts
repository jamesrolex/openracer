import type { IsoTimestamp } from './signalk';

/**
 * Purpose of a leg inside a course. Drives both UI (which slot needs filling
 * to proceed) and downstream analytics (AI debriefs read leg intent).
 */
export type LegType = 'start' | 'windward' | 'leeward' | 'reach' | 'gate' | 'finish';

/**
 * A leg in a course. `marks` is an ordered list of mark ids:
 * - A start or finish leg typically has two marks (committee boat + pin).
 * - A gate leg has two marks (left gate, right gate).
 * - A windward / leeward / reach leg has one mark.
 *
 * We model it as a list so reaches with offset marks (common in Olympic
 * courses) and single-pin starts (common in club racing) both fit.
 */
export interface Leg {
  id: string;
  type: LegType;
  label: string;
  /** Ordered list of mark ids that define this leg. May be empty while the
   *  user is still building the course — the course is not armable until
   *  every leg has its required marks. */
  markIds: string[];
  /** How many marks this leg requires before the course can arm. */
  requiredMarks: number;
  /**
   * For rounding marks: which side the boat leaves the mark on. `null` for
   * start/finish/gate legs where it doesn't apply. Defaults to `port` for
   * windward/leeward in racing-rules-compliant templates.
   */
  rounding: 'port' | 'starboard' | null;
}

/** Identifier for the built-in templates. `custom` means user-defined. */
export type CourseTemplateId =
  | 'windward-leeward'
  | 'olympic'
  | 'triangle'
  | 'trapezoid'
  | 'round-the-cans'
  | 'custom';

/**
 * Built-in template definition. `buildLegs()` returns a fresh set of empty
 * legs with stable ids so the UI can track slots as the user fills them.
 */
export interface CourseTemplate {
  id: CourseTemplateId;
  name: string;
  description: string;
  buildLegs: () => Leg[];
}

/** Lifecycle of a course from first edit to raced-and-archived. */
export type CourseState = 'draft' | 'armed' | 'racing' | 'completed' | 'archived';

export interface Course {
  id: string;
  name: string;
  templateId: CourseTemplateId;
  legs: Leg[];
  state: CourseState;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** Fields supplied when creating a new course. */
export type CourseInput = Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'state'> & {
  state?: CourseState;
};
