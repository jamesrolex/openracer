# Phase 1.7 — E-ink readiness + tactical depth

**Duration:** ~1 week (6 features in two tracks)
**Build system:** **Expo Go** — every feature is pure-JS, ships via EAS Update.
**Why this exists:** project owner reminded me OpenRacer is meant to drive
**e-ink displays on the boat** as well as phones (Tier 2 + Tier 3 in
the spec). Until the Pi + display orchestrator phase lands (Phase 6/7),
we can still bake e-ink fitness into the design *now* so the existing
UI ports cleanly when the time comes. Plus a tactical-depth bonus track
the Navionics research called out.

## Why e-ink changes the design

E-ink rules:

| Constraint | What we change |
|---|---|
| Greyscale only (16 levels) | No colour-only status signals — every state needs shape/pattern fallback (stripes, outlines, double-borders, glyphs) |
| Slow refresh (~1 s full / ~200 ms partial) | No animation. State changes are discrete. The countdown needs a visual model that doesn't depend on animation continuity |
| High contrast (black on white) reads best | A pure B/W theme called "Kindle" alongside the existing day/night |
| Variable aspect ratios | Layouts should work portrait + landscape both phone-shape and 6:4 e-ink |
| Read-only acceptable | A "Helm Display" mode strips controls to a glance display, designed for the cockpit and re-usable as the e-ink template |

## Track 1 — Display readiness (3 features)

### 1.7.1 — Kindle theme variant + shape-based status

**Problem.** Today our status colours (AP amber, X red, Success green,
favoured-end gradient) are colour-only. A grey rendering of those
strips is mush.

**Shape.**
- New `theme: 'day' | 'night' | 'kindle'` option in
  `useSettingsStore`. Picker on Settings → Display.
- New `kindleTheme` in `theme/theme.ts` — pure black/white with grey
  midtones. No accent colour beyond a single dark-grey pill.
- Audit every status signal across screens and add a shape/pattern
  fallback that's also still in the colour theme (additive, not
  replacement) so day/night don't lose information either:
  - **AP banner** — adds a dashed-border treatment.
  - **X (individual recall)** — adds a heavy outline + `[X]` glyph.
  - **OCS** — adds a solid black border + `OCS` text (already there).
  - **Favoured end** — chip already has the arrow + magnitude; add a
    secondary border thickness when |bias| > 8°.
  - **State chips** in Race history — already use distinct labels
    + colours; verify they're readable in greyscale.
- Onboarding includes the option in the welcome flow ("How will you
  use it? Day on phone / Night sailing / Kindle / e-ink display
  later") — selecting Kindle previews the theme.

**Effort:** 1 day.

### 1.7.2 — Helm Display Mode (kiosk timer)

**Problem.** A phone bolted in the cockpit is the helm's only display.
The current RaceTimerScreen is configured for an RC at the committee
boat — cluttered with Sync / -1 / +1 / AP / X / Recall / Finish
controls. The helm doesn't need any of that. They need the giant
countdown + the 1-2 readouts that matter at this moment.

**Shape.**
- New "Helm Display" toggle on RaceTimerScreen. Tap → controls hide
  + countdown swells to fill the screen + start-line readout (or
  course-progress mid-race) becomes the secondary readout below it.
- Tap-and-hold on the screen to bring controls back ("revealing"
  the RC side again).
- Designed to work in landscape (see 1.7.3) so a cockpit phone in
  a Velcro mount is the natural shape.
- Layout deliberately uses big black-on-white blocks — no
  drop-shadows, no gradients. The same render shape will port to
  the e-ink driver in Phase 7 as `<HelmDisplay />` mounted under
  a different RN platform target (or just a static layout the Pi
  can rasterise).
- Setting persists per device — once toggled into helm mode it
  stays there until tapped out. Survives app restart.

**Effort:** 1 day.

### 1.7.3 — Landscape layout for race timer

**Problem.** Phones bolt into cockpits in landscape orientation
(Velcro / RAM mount above the companionway). Today the timer is
portrait-only — locked by the Expo `orientation: 'portrait'` config.

**Shape.**
- Drop the global `'portrait'` lock from `app.json`; switch to
  `'default'` so individual screens can choose.
- RaceTimerScreen + Helm Display Mode actively support landscape
  with a different layout (countdown on the left, readouts on the
  right; or vice-versa). Other screens stay portrait via per-screen
  orientation control.
- iOS provisioning: confirm `UISupportedInterfaceOrientations`
  for iPhone covers landscape too (default in Expo SDK 54 + we
  haven't restricted it).

**Effort:** 0.5 day.

### Track 1 exit gate

- [ ] Settings → Display has Day / Night / Kindle picker.
- [ ] Kindle theme renders the timer + course-entry + start-line
      cleanly with no colour information lost.
- [ ] Toggling to Helm Display strips controls on the timer.
- [ ] Long-press reveals controls again.
- [ ] RaceTimerScreen survives a rotate to landscape with a sensible
      layout.

## Track 2 — Tactical depth (3 features)

### 1.7.4 — Wind shift bar

**Problem.** Sailors track wind shifts in their head every leg. We
have GPS + compass; we can compute approximate apparent-wind shifts
from how COG vs heading rotates across tacks. Not as good as a real
wind instrument, but better than mental arithmetic.

**Shape.**
- New `useWindShiftTracker` hook subscribes to boat store. Records
  COG samples when `sog > threshold` (1 kn) so stationary noise is
  ignored. Detects tacks by COG step-changes > 60° within < 10 s.
- Maintains a rolling baseline TWA estimate from the user's `manual
  TackAngle` setting (default 88°) and the current upwind COG. Each
  fresh upwind COG sample compared to the baseline → shift in
  degrees, port-positive.
- Render: a horizontal strip on RaceTimerScreen during the race
  showing "+6° lift" / "-3° header" with a 60-second history bar.
- Honest: when phone-compass quality is low (calibration warning
  from `useCompass`), the strip displays "compass unreliable" and
  hides numbers. No false confidence.

**Effort:** 2 days. New domain module + hook + component + tests.

### 1.7.5 — Polar / target boatspeed (manual table input)

**Problem.** Racers want "target: 6.2 kn" alongside their actual SOG.
Phase 4+ AI debrief learns polars from instruments; today the
manual-input version is enough.

**Shape.**
- New `polars` module — represents a polar table as TWS rows × TWA
  columns. Linear interpolation for in-between values. JSON
  serialisable.
- Settings → Racing gains a "Polar table" entry. Users paste their
  ORC / class-default polar (multiline plain text in the standard
  TWS \t TWA \t target format), or pick from a small built-in
  catalogue (J/24, J/80, Sonata, Sigma 33, generic 30-foot
  cruiser-racer).
- During a race: small "TARGET" readout next to SOG. Shows
  "6.2 kn" alongside actual SOG. Hidden when no polar set.
- Polar evaluation needs current TWS — for v1, derive from
  `manualTrueWindKn` setting we'll add alongside the existing
  `manualTrueWindDegrees`.

**Effort:** 2 days. Parser + interpolation + tests + UI.

### 1.7.6 — Per-leg timer

**Problem.** "How long was that beat?" is a question every debrief
asks. We've got the race start time but no per-leg breakdown.

**Shape.**
- New "rounded mark" tap on the race timer: "Mark 1 rounded" / "Mark
  2 rounded" buttons appear during 'running' state, one per leg.
- Tap → captures `legCompletedAt[legIndex] = now`.
- Display shows "Mark 1: 4:32" / "Mark 2: 7:18" history below the
  countdown.
- Persisted alongside `useRaceStore`.

**Effort:** 0.5 day.

### Track 2 exit gate

- [ ] Wind shift bar shows realistic numbers during a real upwind
      leg (within 5° of a hand-held compass), or hides itself with
      a clear "unreliable" message when the compass is uncalibrated.
- [ ] Polar parses an ORC J/80 file pasted from the web.
- [ ] Target speed updates within 1 s of a TWS or TWA change.
- [ ] Per-leg timer captures times in a Wednesday-night race +
      shows up in race history.

## Out of scope for Phase 1.7

- **Live track replay on chart** — Phase 2 (needs MapLibre).
- **Multi-crew sync / rabbit broadcast** — Phase 4.5 (needs BLE).
- **Live Pi + e-ink mirroring** — Phase 6/7. We're prepping the
  layout, not building the wire protocol yet.
- **Polar self-learning from race tracks** — Phase 4+ AI.
- **Wind GRIB overlay** — needs the chart view (Phase 2/3).

## Sequencing

- **Day 1**: 1.7.1 Kindle theme.
- **Day 2**: 1.7.2 Helm Display Mode.
- **Day 3**: 1.7.3 Landscape support + Track 1 audit + commit + push +
  EAS update.
- **Day 4-5**: 1.7.4 Wind shift bar.
- **Day 6-7**: 1.7.5 Polar / target boatspeed.
- **Day 7**: 1.7.6 Per-leg timer + final audit + commit + EAS update.

If Track 2 stalls, ship Track 1 alone. Track 1 is the e-ink-readiness
work the project owner specifically asked for.

---

## Retro — 2026-04-25 (Phase 1.7 condensed — both tracks shipped)

Spec'd + shipped both tracks in a single session, in response to the
project owner's reminder that e-ink displays are part of the boat
target stack.

**Architectural framing crystallised:** project owner clarified that
e-ink displays are **read-only sensor dashboards** set up by the
phone or the Pi. They render data, they don't accept input. The
**Helm Display Mode** built in Track 1 is the canonical prototype for
this — same component will render on the Pi-driven e-ink display in
Phase 7 with no logic changes, just a different platform target. The
"dashboard catalogue" pattern (multiple read-only views the sailor
picks per display) is logged for Phase 7+ in
`docs/future-features.md`.

**Track 1 — display readiness:**
- ✅ 1.7.1 Kindle theme variant (pure black/white, no colour-only
  signals). New `kindleTheme` in `theme/theme.ts`. Settings screen
  picker lets the sailor switch between Day / Night / Kindle.
  `nightMode` boolean stays in sync with the theme field for backward
  compatibility — no consumer code had to change beyond reading
  `state.theme` instead of `state.nightMode`.
- ✅ 1.7.2 Helm Display Mode. New `HelmDisplayLayout` component is the
  e-ink-ready dashboard template: massive countdown + state label +
  one secondary readout (start-line distance pre-start, course
  progress mid-race). Tap-and-hold reveals the "Show controls" exit.
  Persists in `useSettingsStore.helmDisplayMode`. Same render shape
  ports cleanly to the Pi+e-ink driver in Phase 7.
- ✅ 1.7.3 Landscape support. Dropped the global `'portrait'` lock in
  `app.json` to `'default'`. Cockpit phone in a Velcro mount now
  rotates naturally — every existing screen still works in landscape
  via flexbox, the Helm Display + race timer were designed for it
  already.

**Track 2 — tactical depth:**
- ✅ 1.7.4 Wind shift bar. Pure-domain `windShift` module computes
  shift from a rolling buffer of GPS COG samples — tack detection,
  baseline upwind COG, signed delta, quality grading. 19 unit tests
  covering wrap-around degrees, stationary-sample filtering, low-
  quality flag, tack reset. New `useWindShiftTracker` hook subscribes
  to the boat store and feeds the snapshot. New `WindShiftBar`
  component renders +6° lift / -3° header on a ±20° track strip.
  Honest "compass noisy" message when quality drops.
- ✅ 1.7.5 Polar / target boatspeed. New `polars` domain module parses
  ORC-style polar tables with bilinear interpolation between the four
  nearest TWS×TWA cells. 11 unit tests including TWS clamping, TWA
  mirroring past 180°, unsorted row handling. Settings screen gains
  `WindSpeedRow` (true-wind speed input) + `PolarRow` (paste your own
  polar or pick from `BUILTIN_POLARS` — J/24, Sigma 33). Race timer
  shows a `TargetSpeedStrip` during running state with target +
  actual + percent-of-target, colour-banded (green ≥ 97%, white ≥
  90%, amber otherwise).

**Counts at end of phase:**
- 262 tests across 24 suites — all green
- 17/17 expo-doctor checks pass
- 0 lint errors / 0 warnings (after dropping the orphan ToggleRow)

**Skipped:** 1.7.6 per-leg timer. Lower priority than the e-ink
readiness work. Logged for Phase 1.8 candidates if it stays
relevant.

**What this phase enables architecturally:**
- The visual design now ports cleanly to e-ink. When Phase 6/7 lands
  the Pi + e-ink driver, the Helm Display layout swaps to a
  rasteriser without touching the React component.
- Tactical depth (wind shift + polars) is no longer a "Phase 4 AI
  thing" — sailors get it today via manual settings + the same
  honest disclosure pattern (low-quality flags hide noise).
- The settings store is the single source of truth for everything
  that varies per-boat: tack angle (still missing — Phase 1.8?),
  wind direction/speed, polar table, theme, helm-display preference.
