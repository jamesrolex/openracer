# Bug tracker

Source of truth for known bugs, quirks, and investigations. Numbered
sequentially (B-001, B-002…). Never re-use a number. Keep fixed bugs in the
log — the history is the record of how we debugged.

## Workflow

1. Spot a bug → add a new row in the table below, assign the next number.
2. Create a detailed entry in "Entries" following the template.
3. Commit under `fix:` or `docs:` depending on whether code changed.
4. Close by setting the row's status to `fixed` and filling in "Resolution".
5. Fixed bugs are never deleted — they become the change log.

## How to know if something is a bug vs out-of-scope

If it contradicts `docs/phase-0-plan.md` or `docs/decisions.md`, it's a bug.
If the behaviour isn't covered there yet, it's a feature gap — log it in
`docs/phase-N-plan.md` for the relevant phase instead, or open a GitHub
issue with the `feature` label.

## Index

| ID | Title | Phase | Severity | Status | Resolution |
|---|---|---|---|---|---|
| B-001 | GPS shows no data on real iPhone via Expo Go | 0 | medium | investigating | — |

Severity scale: `critical` (exit-gate blocker), `high` (feature broken for
many users), `medium` (feature broken for some), `low` (cosmetic / edge case).

Status set: `investigating`, `open`, `fixed`, `wontfix`, `deferred-to-N`.

---

## Entries

### B-001 — GPS shows no data on real iPhone via Expo Go

**Reported:** 2026-04-24 by project owner during first run.
**Phase:** 0
**Severity:** medium
**Status:** investigating

**Symptom**

After `npm start` and scanning the Expo Go QR code on a real iPhone, the
HomeScreen renders but SOG, COG, LAT, and LON all show "—". The bottom
meta line reads "waiting for fix". No obvious error visible.

**Environment**

- Device: real iPhone via Expo Go
- Expo Go: latest (whatever App Store ships today)
- App: bundle bdee883 onwards (scaffold through HomeScreen)

**Hypotheses, ordered by likelihood**

1. **Expo Go location permission denied or set to "Never".** In Expo Go the
   permission is owned by Expo Go the app, not OpenRacer. If James (or a
   previous project) denied location for Expo Go, no fresh prompt will
   appear in our app — we'd see `permissionStatus = 'denied'` or `'undetermined'`.
   Fix: Settings → Privacy → Location Services → Expo Go → While Using.
2. **Phone is indoors with no GPS fix yet.** Cold starts can take 30-60 s
   even when permission is granted. Expect SOG/COG to be `null` with a
   valid position + accuracy for the first few seconds.
3. **Known Expo Go quirk on iOS:** after reloading, location sometimes
   needs a full kill + reopen, not just a JS reload, before re-subscribing.
4. **Bug in `useGPS`** — less likely since the code path is standard
   `watchPositionAsync`. Would show as `error` being non-null.

**Diagnostic tool**

The DevPanel (top-left "DEV" pill in dev builds, tap to expand) surfaces
the raw state the hook is in:

- `permission` — `unknown`, `granted`, `denied`, `undetermined`
- `gps error` — any string from the expo-location library
- `lat`/`lon`/`sog`/... — raw values, `null` if not yet set
- `last update` — ISO timestamp or `null`

Open DevPanel. If `permission` is anything other than `granted`, that's
the issue. If it's `granted` but coords are `null`, it's a fix-acquisition
problem. If `gps error` has a string, that's a library error we need to fix.

**Next steps**

- Project owner opens DevPanel on their phone, reports the row values.
- Resolution will depend on which hypothesis the data supports.

**Resolution**

_Pending_
