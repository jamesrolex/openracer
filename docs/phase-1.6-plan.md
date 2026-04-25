# Phase 1.6 — Sailor depth + RC comfort

**Duration:** ~1 week (4 features)
**Build system:** **Expo Go** — every feature is pure-JS, ships via EAS Update.
**Why this exists:** Phase 1.5 + 1.5.1 turned the timer into a credible
race-officer tool. Phase 1.6 is the depth pass before Phase 2 charts —
the things that make the project owner reach for OpenRacer every
Wednesday rather than only when he's testing it. None of these need
MapLibre, BLE, or the Apple Developer Program.

The bet: depth-of-use beats new screens. Every feature in this phase
attaches to something we already shipped.

## In scope (4 features)

### 1.6.1 — Course library + re-arm saved courses

**Problem.** Today every Wednesday-night race rebuilds the W-L from
scratch — pick template, pick start marks, pick windward mark, pick
leeward mark. Three minutes of fiddly tapping the RC will skip every
fourth time.

**Shape.**
- New `CourseLibraryScreen` accessible from Settings → Racing → "My
  saved courses" and from CourseEntryScreen via "↑ Load saved".
- Lists every persisted course not in the active draft state: name,
  template, start type (rabbit / line / gate), mark count, last-used
  date. Tappable.
- Tap a saved course → "Re-arm this course?" sheet with two paths:
  - **Use as-is** — clones to a new draft, immediately editable. Same
    marks, same legs, same start type.
  - **Use as template** — clones the leg structure but clears mark
    assignments; sailor picks fresh marks on the chart of the day.
- Course names: editable inline. Saved as the user types.
- Swipe to delete (with confirm).

**Effort:** 1.5 days. New screen + re-use coursesRepo + small additions
to useCoursesStore.

### 1.6.2 — Pre-race checklist (RC walk-through)

**Problem.** Right now the RC arms the timer with no sanity check. A
real Wednesday-night start can fail at three places: wind direction
not entered (favoured-end chip is hidden, sailors miss it), rabbit
launch unset (rabbit start RACES with a missing rabbit launch panel),
location permission revoked silently, etc.

**Shape.** A new pre-arm screen overlay or sheet that the user flips
through before tapping "Arm timer":
- **Wind direction set?** if `manualTrueWindDegrees === null` for a
  standard line course, prompt with quick-pick chips (N / NE / E / …
  rotated by 22.5° steps).
- **Rabbit / gate selected?** if course.startType ≠ standard-line,
  confirm.
- **GPS fix age** ≤ 5 s? else show a "go on deck" warning.
- **Notifications permission** granted? else a "you won't hear T-5
  alerts with the screen off" warning.
- **Course armable?** every required leg has its marks (already
  computed by `isCourseReadyToArm`).

The checklist is a card-list with green ticks for satisfied items and
amber prompts for missing ones. Tap an amber prompt → opens the
relevant fix screen (Settings, mark picker, etc.). A bottom-sticky
"Arm timer" button stays disabled until everything is green or the
sailor explicitly taps "Arm anyway" to override.

**Effort:** 1.5 days. New `PreRaceChecklistSheet` component. Small
additions to RaceTimerScreen / CourseEntryScreen arm-flow.

### 1.6.3 — Mark notes / per-mark visual cue cards

**Problem.** "Is the windward Yellow or the offset Yellow?" — sailors
ask this every race. A free-text note field exists on Mark
(`notes?: string`) but isn't shown when a sailor taps a mark in
CourseEntryScreen or MarkPickerSheet.

**Shape.**
- Promote `notes` to first-class. Show a one-line preview under the
  mark name in MarkPickerSheet, the CourseStrip, and Race history
  rows.
- Edit-in-place from MarkLibraryScreen card → existing MarkEditScreen
  already has a notes field; we're just promoting the read-side.
- Add a new optional `colourHint?: string` (e.g. "yellow", "yellow
  with white top", "orange offset") rendered as a small swatch dot
  + label so sailors can spot the right mark from a hundred metres
  away.
- Migration v8 adds `marks.colour_hint TEXT` (nullable).

**Effort:** 1 day. Schema migration + UI promotions; the editor
already exists.

### 1.6.4 — Race history filter + search

**Problem.** RaceSessionsScreen lists every recorded session in
chronological order. After a few weeks of dogfooding the list is
overwhelming and the GPX you want to find is buried.

**Shape.**
- Search bar at the top: filters by session name (race name from the
  course at the time of arming), date range, or state.
- Filter chips: `Finished` / `Abandoned` / `Has track` / `This week`
  / `Last 30 days`.
- Result count: "12 of 47 races".
- Tap-to-clear filters.

**Effort:** 0.5 days. Pure-render layer on top of existing repo data.

## Out of scope for Phase 1.6

- **Polars + target boatspeed** — pulled to Phase 1.7 / 2 once polars
  data model + persistence are designed. The polar table is more work
  than it looks (TWS × TWA × target speed grid + interpolation).
- **Wind shift bar** — depends on stable AWA estimation. Phone compass
  alone is too noisy. Wait for either instrument input (Phase 6) or
  a careful smoothing pass that Phase 1.6 doesn't fund.
- **Mark photos** — needs `expo-image-picker` and storage strategy
  (filesystem vs SQLite blob). Skipping for Phase 1.6 to avoid native-
  module surprises in Expo Go. Mark notes + colour hint cover the
  most-asked-for workflow.
- **Course-template builder** — saving your own custom templates as
  named templates rather than as full saved courses. Saved courses
  cover 90% of the use case; templating is over-engineering for now.

## Phase 1.6 exit gate

- [ ] Project owner can re-arm last Wednesday's W-L course in ≤ 10 s
      from CourseEntryScreen.
- [ ] Pre-race checklist catches a missing wind direction in a real
      pre-start.
- [ ] Marks in the seeded Abersoch fixture all have colour hints +
      one-line notes; visible in the picker.
- [ ] Race history searchable in airplane mode.
- [ ] `npm run audit` clean.
- [ ] EAS Update bundle published with the new features visible in
      Expo Go on the project owner's iPhone.

## Sequencing

- **Day 1**: 1.6.1 — course library (highest ROI; biggest UX win).
- **Day 2**: 1.6.2 — pre-race checklist.
- **Day 3**: 1.6.3 — mark notes + colour hint (with v8 migration).
- **Day 4**: 1.6.4 — race history filter + audit + commit + push +
  EAS update.

If anything stalls, ship what's done and document the rest as
Phase 1.7 candidates.

---

## Retro — 2026-04-25 (Phase 1.6 condensed)

Plan and shipped in the same session.

**Shipped:**
- ✅ 1.6.1 Course library + re-arm. New `CourseLibraryScreen` accessible
  from Settings → Racing and from CourseEntry header ("Load"). Tap a
  saved course to "Use as-is" (clones with marks) or "Use as template"
  (clones leg shape, blanks marks). Long-press to rename, swipe to
  delete. Search by name or template id. Store gained
  `cloneAsDraft`, `renameCourse`, `removeCourse`, `archiveDraft`.
- ✅ 1.6.2 Pre-race checklist. New `PreRaceChecklist` component +
  pure `buildChecklist()` function with 6 unit tests. Modal opens
  before arming the timer. Catches: course unfilled, wind direction
  not set (standard line), GPS stale, notifications denied. Rabbit
  starts get a "Rabbit briefed" info row instead of the wind one.
  Read-only `checkNotificationPermissions()` helper added so the
  checklist can read OS state without firing a prompt.
- ✅ 1.6.3 Mark notes promotion + colour hint. v8 migration adds
  `marks.colour_hint`. MarkEditScreen gains a colour-hint input.
  MarkCard + MarkPickerSheet now show the colour swatch + label and
  a one-line notes preview. New exported `swatchColour()` helper
  maps free-text colour hints to recognisable swatch colours.
- ✅ 1.6.4 Race history filter + search. RaceSessionsScreen now has
  a search bar + 6 filter chips (All / Finished / Abandoned / Has
  track / This week / 30 days). Pure `applyHistoryFilter()` function
  with 8 unit tests. Result counter ("12 of 47 races") and a friendly
  empty-state when filters exclude everything.

**Counts:**
- All four features built, audited, in a single session.
- New tests: 6 (PreRaceChecklist) + 8 (applyHistoryFilter) = 14.

**What we deliberately didn't build** (logged in this plan's "Out
of scope"): polars, wind shift bar, mark photos, course-template
builder. All have valid reasons; none block on the £79 Apple
Developer Program.

**Next:** Apple Developer signup whenever ready unlocks Phase 2.
Until then the EAS Update bundle gives you these features on your
iPhone via Expo Go.
