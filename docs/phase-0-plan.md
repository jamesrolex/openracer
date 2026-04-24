# Phase 0 — Skeleton & Offline Foundations

**Duration:** 2 weeks
**Goal:** A React Native app that runs on iOS and Android, shows live GPS, and works with no network.

Nothing user-facing yet. This is the scaffold everything else sits on.

## Why we do this first

Three reasons:

1. **Offline-first is architectural, not a feature.** If we try to retrofit offline support later, we'll paint ourselves into corners. Building the offline contract in Phase 0 means every subsequent feature inherits it for free.
2. **Stack confidence.** We've chosen Expo + React Native + Zustand + expo-sqlite + MapLibre. Phase 0 validates all of them work together before we depend on them for Phase 1's hero feature (course entry).
3. **Fastest path to something I can hold in my hand.** By end of week 2, the project owner runs the app on their phone, in aeroplane mode, and sees their own GPS position updating live. That's the "it's real" moment.

## In scope

### Project setup
- Initialise Expo SDK 52+ managed workflow project with TypeScript strict mode
- Bundle ID: `com.openracer.app`
- Configure ESLint + Prettier (simple defaults, don't over-tune)
- Add Jest + React Native Testing Library
- Create `.github/workflows/ci.yml` running typecheck + tests on push (optional, skip if it adds friction)

### Directory structure
```
src/
├── components/          Reusable UI primitives
├── hooks/               Custom React hooks
├── screens/             Top-level screens
├── stores/              Zustand state stores
├── types/               Shared TypeScript types
├── utils/               Pure utility functions
└── theme/               Design tokens
```

### Core types (`src/types/`)
- `signalk.ts` — SignalK-compatible types for position, speed, wind, etc. Use SignalK path conventions (e.g. `navigation.position`, `navigation.speedOverGround`).
- `mark.ts` — Mark type with `tier`, `validFrom`, `validUntil`, `source`, `owner`, `confidence`, `latitude`, `longitude`. (Used later in Phase 1, but defined now so types propagate.)
- `connectivity.ts` — `ConnectivityMode = 'offline' | 'patchy' | 'constant'`
- `mode.ts` — `AppMode = 'race' | 'cruise'`

### Utilities (`src/utils/`)
- `format.ts`
  - `formatLatLon(lat, lon, format: 'dms' | 'dmm' | 'decimal')` — returns string
  - `metersPerSecondToKnots(mps)` — number
  - `knotsToMetersPerSecond(kts)` — number
  - `formatDistance(metres, unit: 'nm' | 'km' | 'm')` — string
  - `formatBearing(degrees)` — "270°"
- `geo.ts`
  - `bearingBetween(from, to)` — degrees true
  - `distanceBetween(from, to)` — metres (haversine)
  - `destinationPoint(from, bearing, distance)` — new point

**Both files have Jest test coverage. Edge cases: antimeridian crossing, poles, zero distance, negative coordinates. Aim for 100% branch coverage on these two files.**

### Hooks (`src/hooks/`)
- `useGPS()` — wraps expo-location, returns `{ position, speed, heading, accuracy, lastUpdate }`. 1Hz update rate. Gracefully handles permission denial (returns nulls, exposes `permissionStatus`).
- `useConnectivity()` — wraps expo-network. Returns `ConnectivityMode`. For Phase 0, 'patchy' vs 'constant' distinction is approximated by network type (cellular = patchy, wifi = constant). True bandwidth testing deferred.

### Zustand stores (`src/stores/`)
- `useBoatStore` — current position, speed, heading, mode, connectivity. Updated by hooks.
- `useSettingsStore` — unit preferences (default metric/knots/nautical miles), night mode flag, language (default `en-GB`). Persisted via expo-sqlite.

### Components (`src/components/`)
- `BigNumber` — large glanceable number with label underneath. Props: `value`, `label`, `unit?`, `colour?`. This is THE core visual primitive.
- `ConnectionBadge` — small indicator showing offline/patchy/constant state. Non-alarming colours.
- `ModeToggle` — Race/Cruise switch. Top-right position. Placeholder in Phase 0 (doesn't actually change behaviour yet).

All components use design tokens from `src/theme/`, not hardcoded values.

### Theme (`src/theme/`)
- `tokens.ts` — colours, typography scales, spacing, radii. See `skills/design-system/SKILL.md` for the full token list.
- `theme.ts` — composes tokens into a theme object, with `day` and `night` variants.

### HomeScreen (`src/screens/HomeScreen.tsx`)
Phase 0 HomeScreen layout (no fancy features yet):
- Top bar: `ConnectionBadge` (left), `ModeToggle` placeholder (right)
- Main area: four `BigNumber` displays — SOG (knots), COG (degrees), LAT (decimal), LON (decimal)
- Bottom: small text showing last GPS update time + accuracy

## Acceptance criteria (exit gate)

All must pass before Phase 0 is "done":

- [ ] `npx expo start` launches without errors
- [ ] App runs on iOS simulator (tested on iPhone 15 Pro size)
- [ ] App runs on Android emulator (Pixel 6 API 34)
- [ ] GPS permission prompt appears on first launch
- [ ] Granting permission shows live coordinates updating
- [ ] Denying permission shows graceful "permission needed" UI (not a crash)
- [ ] `airplane mode` test: enable aeroplane mode on device, restart app, GPS still functions (satellites work without cellular)
- [ ] `npm run typecheck` passes with no errors
- [ ] `npm run test` passes, `format.ts` and `geo.ts` at 100% coverage
- [ ] `npm run lint` passes
- [ ] Bundle ID is `com.openracer.app`
- [ ] All user-facing strings use British English
- [ ] All numeric values display in knots / metres / nautical miles
- [ ] Connection badge shows correct state (toggle airplane mode → shows "offline")
- [ ] At least 8 atomic commits with conventional format
- [ ] `README.md` project-level instructions for running locally are correct

## Out of scope for Phase 0 — DO NOT BUILD

- Marks, course entry, race timer — Phase 1
- Charts, MapLibre integration — Phase 2 (types only in Phase 0)
- Navigation mode features (MOB, anchor alarm, etc.) — Phase 3
- AI / Claude API / local model — Phase 4+
- Bluetooth, BLE, NMEA parsing — Phase 6+
- SignalK server client — Phase 6+
- Onboarding flow — later, not critical yet
- Authentication / user accounts — Phase 8+
- Settings screens beyond trivial — later
- Icons, app splash, branding — later (ship plain-vanilla for Phase 0)
- Multi-language support — English-GB only for now

**If the project owner asks for something from the "Out of scope" list during Phase 0, push back: "that's Phase N scope, want me to add a note for when we get there?"**

## Recommended task order

1. Scaffold Expo project, commit
2. Add directory structure + empty files, commit
3. Write types (no logic), commit
4. Write utilities + tests, commit
5. Write theme + tokens, commit
6. Write components (static), commit
7. Write hooks, commit
8. Write stores, commit
9. Wire HomeScreen, commit
10. Aeroplane-mode test, commit any fixes
11. Final typecheck + test + lint pass, tag `v0.1.0-phase0`

## When Phase 0 is done

State clearly: "Phase 0 complete. All exit gate criteria pass. Awaiting green light to propose Phase 1 plan."

Then stop. The project owner starts a fresh Claude Code session for Phase 1.
