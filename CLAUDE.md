# OpenRacer — Claude Code Instructions

## What this is

Open-source racing and navigation system for sailors. Three tiers:
1. Free app (phone only)
2. Raspberry Pi + existing marine instruments
3. Full hardware kit

**Built with:** React Native + Expo SDK 52 + TypeScript + Zustand + expo-sqlite + MapLibre

**Target user:** Club racers and cruisers. Core venue: Abersoch Yacht Club, North Wales (no cellular signal mid-race).

## Read these first

Before any meaningful task, read:
- `docs/spec-summary.md` — condensed v0.6 spec, the product bible
- `docs/phase-0-plan.md` — what we're building right now (THIS is scope)
- `docs/decisions.md` — architectural decisions already locked

When a task touches a specific area, also read the relevant skill:
- UI work → `skills/design-system/SKILL.md`
- Feature with network dependency → `skills/offline-first/SKILL.md`
- Anything marine/sailing domain → `skills/marine-domain/SKILL.md`

Full v0.6 spec lives at `docs/openracer_spec_v0.6.docx` for reference.

## Current phase: Phase 0 — Skeleton & offline foundations

**Two weeks. Scaffold only.** See `docs/phase-0-plan.md` for the acceptance criteria.

**In scope for Phase 0:**
- Expo app that runs on iOS simulator and Android emulator
- HomeScreen with live GPS (lat/lon/SOG/COG), connectivity badge, mode toggle placeholder
- Zustand stores (`useBoatStore`, `useSettingsStore`)
- Hooks (`useGPS`, `useConnectivity`)
- SignalK-compatible TypeScript types
- Reusable components (`BigNumber`, `ConnectionBadge`, `ModeToggle`)
- Design tokens + theme
- Utility functions (format, geo) with Jest tests
- Works in airplane mode

**NOT in scope for Phase 0** (defer, do not build):
- Marks, course entry, race timer — Phase 1
- Charts — Phase 2
- Navigation mode — Phase 3
- AI anything — Phase 4+
- Bluetooth, NMEA, SignalK server — Phase 6+

If asked to build something outside Phase 0 scope, pause and confirm with the user.

## Working style

**The user is the product owner, not a developer.** IT-literate, British, dyslexic, visual thinker. Former luxury watch e-commerce, now commodity brokerage. Direct and rational — skip preamble.

- **British English** in all user-facing strings (`colour`, `centre`, `harbour`, not `color`, `center`, `harbor`)
- **Metric/nautical units** — knots, metres, nautical miles, degrees true
- **Short paragraphs, clear headings** in responses. No walls of text.
- **Ask ONE question at a time** when blocked. Don't stack questions.
- **Default sensibly, note the decision, don't halt.** If you need a small choice (variable name, file structure), pick the obvious option, note it in the commit message, keep moving.
- **Verify, don't assume.** Say "I ran the tests, here's the output" not "should work".
- **Plain English for errors.** If you show a stack trace, also translate it.

## Commit style

Atomic commits, conventional format:
- `feat: add connectivity badge component`
- `fix: GPS hook crashes on permission denied`
- `docs: update phase-0 acceptance criteria`
- `chore: bump expo-location to latest`
- `test: add format.ts unit tests`

Commit often. A day's work = multiple commits, not one big one.

## Stack decisions (locked)

- **React Native + Expo SDK 52+**, managed workflow, TypeScript strict mode
- **State:** Zustand (not Redux)
- **Storage:** expo-sqlite
- **Maps:** MapLibre (not Mapbox, not Google)
- **UI library:** Tamagui deferred to Phase 1 — Phase 0 uses React Native primitives + design tokens
- **Testing:** Jest + React Native Testing Library
- **Bundle ID:** `com.openracer.app`

## What NOT to do

- Don't add features outside Phase 0 scope
- Don't introduce new dependencies without flagging it
- Don't write code that assumes network is available
- Don't use American spellings in user-facing text
- Don't use imperial units in user-facing text
- Don't stack multiple questions when blocked — ask one
- Don't ship code without running the tests

## When you're done with a task

State what you did, what you verified works, and what the next task should be. Then stop and wait.
