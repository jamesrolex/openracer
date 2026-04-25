# Phase 1.9 — Crew sync via QR

**Duration:** ~1 day
**Build system:** **Expo Go** — pure-JS, ships via EAS Update.
**Why this exists:** project owner's specific use case — his dad
helms while James handles the timer and tactics. Today every crew
member has to set up the race independently on their phone and
they all drift out of sync within minutes (different gun times,
different courses, different wind direction inputs). One QR scan
fixes that.

This is a smaller, immediate version of the **multi-crew yacht-
data sync** logged in `docs/future-features.md` for Phase 4.5.
Phase 4.5 = live BLE peer-sync (changes propagate continuously).
Phase 1.9 = one-shot QR sync at arm-time (everyone starts on the
same gun + course; phones drift independently after).

That's enough for "we're racing the same race." Not enough for
"we coordinate every gun-sync tap" — but that's not what most
crews need. The helm needs to see the same countdown as the
tactician, and the tactician needs to call laylines the helm can
trust. One-shot sync covers both.

## How it works (user-facing)

1. James (RC / navigator) arms a race on his phone.
2. Race Timer gains a "**Share with crew**" button.
3. Tap → big QR fills the screen, with the course, the gun time,
   the start sequence, the wind direction, the wind speed (if
   set), and the rabbit-launch time (if set).
4. Each crew member opens Expo Go on their iPhone, opens the
   same `@jamesrolex/openracer` bundle URL once at the start of
   the season.
5. Crew taps **Settings → Committee push → Scan a committee QR**
   (the same scanner that handles trust pairings + course pushes
   today).
6. Scans James's QR.
7. App: "Join 'Wednesday Evening' from James? Gun at 19:32, course
   has 4 marks, standard line. — **Join** / **Cancel**"
8. Tap Join. Their timer arms with the same gun, same course,
   same wind. Their phone now runs the same countdown
   independently.

After the scan, each phone is independent. If James syncs the
gun ±1 minute, his dad's phone doesn't follow. **Crews live with
this** because everyone's looking at their own count anyway and
the deltas are usually 0–1 seconds. Phase 4.5 (BLE) closes this
gap when it lands.

## Wire format

Extend the existing `QrEnvelope` union with a new kind
`'openracer-race-bundle'`. Reuse the signed-bundle codec from
committee-push so the trust model works the same:

```ts
type QrEnvelope =
  | { kind: 'openracer-trust'; ... }     // existing
  | { kind: 'openracer-bundle'; ... }    // existing — committee course-push
  | { kind: 'openracer-race-bundle';     // new in Phase 1.9
      version: string;
      raceBundle: SignedRaceBundle };
```

`SignedRaceBundle` payload:

```ts
interface RaceBundlePayload {
  schemaVersion: '1.0.0';
  issuedAt: string;            // ISO timestamp
  senderId: string;            // typically the sender's committee id
  senderName: string;          // human-readable
  raceName: string;            // course.name
  // The course in committee-push wire format. Receivers reuse the
  // existing ingest path to materialise marks + course locally.
  course: CoursePushPayload;
  // Race state at the moment of share.
  gunAt: string;               // ISO — sequenceStartTime
  startSequence: StartSequence;
  manualTrueWindDegrees?: number;
  manualTrueWindKn?: number;
  rabbitLaunchAt?: string;     // for rabbit / gate starts
}
```

Signed with the sender's private key (same ECDSA P-256 we use for
committee-push). Receivers verify against trust list. Sailors have
to trust James's identity once at the start of the season — same
way they trust a committee boat — for race bundles to be accepted.

In a casual "two phones in the same boat" scenario we may also
allow a **trust-on-first-use** prompt for race bundles only — the
crew sees James's identity QR + a "trust permanently?" check on
the first scan. Different from committee-push because the stakes
are lower (it's just for synchronising a race timer, not
broadcasting marks to the fleet).

## In scope

### 1.9.1 — Wire format

- `RaceBundlePayload` + `SignedRaceBundle` types in
  `src/types/coursePush.ts`.
- Builder + verifier in `src/domain/coursePush.ts`:
  `buildRaceBundle(input)` + `verifyRaceBundle(bundle, trust)`.
- Extend the QR envelope union; bump the discriminator without
  breaking existing flows.
- Unit tests covering: builder produces a valid signed payload,
  verifier accepts trusted, verifier rejects untrusted, schema-
  version mismatch handling.

### 1.9.2 — Race-bundle ingest

- Extend `coursePushIngest.ts` (or add `raceBundleIngest.ts`):
  on accept, calls `createCourse` + `useRaceStore.arm(gunAt,
  courseId)` + `setManualTrueWind*` if present + `setRabbitLaunchAt`
  if present.
- Idempotent: if the same bundle is scanned twice, the second
  scan no-ops (compare issuedAt + senderId).

### 1.9.3 — UI

- New "**Share with crew**" button on `RaceTimerScreen` in the
  action row, between General Recall and Finish/Abandon.
- Reuses `ShareCourseScreen` shape but rendering a race bundle
  QR instead of a course-only one. Could be a new
  `ShareRaceScreen` or a flag on the existing one.
- `ScanCoursePushScreen` already handles the trust + course
  envelopes; we add a third branch for race bundles with a
  Confirm sheet.

## Out of scope for Phase 1.9

- **Live sync** — Phase 4.5 (BLE peer-sync).
- **Per-crew GPS sharing** — Phase 4.5.
- **Crew identities + roles** (helm, tactician, navigator) —
  Phase 4.5+. Today every crew member is just "a phone scanned
  the QR."
- **Voice / chat** — never. Wrong tool.

## Phase 1.9 exit gate

- [ ] Project owner can share a race from his iPhone to his dad's
      iPhone via QR scan in under 30 seconds.
- [ ] Both phones run the countdown to the same gun within 0.5 s
      of each other.
- [ ] Wind direction transferred — favoured-end chip shows on
      both phones.
- [ ] Course transferred — both phones have the same legs + marks.
- [ ] `npm run audit` clean.
- [ ] EAS Update bundle published.

---

## Retro — 2026-04-25 (extended-evening session)

Spec'd + shipped in one session. Phase 1.8 (dashboards) paused so 1.9
could ship the more concrete user need first — project owner's dad
helming wants to see the same race info.

**Shipped:**
- ✅ **Race-bundle wire format**. New `RaceBundlePayload` +
  `SignedRaceBundle` + `RACE_BUNDLE_SCHEMA_VERSION`. Reuses ECDSA
  P-256 signing pipeline from committee-push. QR envelope union
  extended with `'openracer-race-bundle'` discriminator.
- ✅ **Race-bundle build + decode** (`buildRaceBundle`,
  `decodeRaceBundle`, `describeRaceDecodeError`). Embeds the
  course as a `CoursePushPayload` and adds `gunAt` +
  `startSequence` + optional wind direction/speed +
  rabbitLaunchAt.
- ✅ **Race-bundle ingest** (`ingestRaceBundle`). Re-uses
  `ingestCoursePushBundle` for the embedded course, then sets
  wind state in useSettingsStore (only when present in the
  bundle), arms the race timer at the gun time, optionally sets
  rabbitLaunchAt.
- ✅ **ShareRaceScreen** with QR + bundle metadata + empty states
  (no identity / no armed timer / build error). Reachable from
  RaceTimerScreen via a new "⇪ Share with crew" link next to the
  helm-display toggle.
- ✅ **Boat-profile bundle** (1.9 b — added mid-session per a
  refinement: project owner asked for boat-specific setup so dad
  sees the same waypoints + polar). New `BoatProfilePayload` +
  `SignedBoatProfile`. `buildBoatProfile` + `decodeBoatProfile` +
  `ingestBoatProfile`. Bundles marks (with colour hint + notes)
  + polar table.
- ✅ **ShareBoatProfileScreen** with editable boat name + bundle
  preview + QR. Reachable from Settings → Crew + committee.
- ✅ **ScanCoursePushScreen extended** to dispatch on three new
  envelope kinds (trust + course-bundle existed; race-bundle and
  boat-profile new). Same trust-list verification for all signed
  bundles. Friendly Confirm sheets per kind ("Join…" for race,
  "Adopt…" for profile).
- ✅ **Settings nav reorganised**. Old "Committee push" section
  renamed to "Crew + committee". New "Share boat profile" link.
  Existing "Trusted committees" relabelled to "Trusted committees
  + crew" since it's now used for both. Existing "Scan QR" copy
  updated to mention crew flows.

**What this enables:**
- Project owner's dad scans James's race QR before the start and
  has the same gun + course + wind direction + rabbit launch
  loaded. Both timers count down to the same moment.
- One-time at the start of the season, dad scans James's boat
  profile QR and his phone has the full Lyric mark library +
  the same polar table.
- The phones still drift independently after the scan (each
  arms its own timer locally). True live sync is Phase 4.5
  BLE territory — logged in `docs/future-features.md`.

**Counts:**
- ~600 lines added across types/coursePush, domain/coursePush,
  domain/coursePushIngest, qrEnvelope, two new screens, plus
  ScanCoursePushScreen + Settings + nav wiring.

**On-water exit gate (Phase 1.5 onwards):** still open. Project
owner pivoted from "ship Phase 1.8 dashboards" to "ship 1.9 crew
sync" mid-flight, so the dogfood gate moves with him.

**Phase 1.8 (dashboards) plan stays in `docs/` ready to resume.**
