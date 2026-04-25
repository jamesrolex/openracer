# Future feature specs

Not scheduled yet. Each entry is a thinking document — what the feature is, what it costs, what it depends on, where it probably lives in the roadmap.

When one of these graduates to a real phase, move the content into the relevant `docs/phase-N-plan.md` and leave a one-line pointer here.

---

## Rabbit start — Option C (live rabbit broadcast)

Phase 1.5.1 shipped Option A (the honour-system version): we know the
course is a rabbit start, we hide the spatial start-line readout, and
we capture "rabbit launched!" as a manual tap. No spatial guidance.

Option C is the right answer: the boat designated as the rabbit runs
OpenRacer in a **rabbit role** that broadcasts its GPS at 1 Hz over
the same BLE peer-sync layer that powers multi-crew yacht-data sync
(see next entry). Receiving competitors' apps recompute the start
line live as `pin → rabbitStern(now)` — real distance-to-line, real
"behind the rabbit's stern" detection, real OCS.

**Dependencies.**

- BLE peer-sync infrastructure (Phase 4.5).
- A new role on top of the yacht-session model: `rabbit` is a
  one-of-N boat in the local race who broadcasts to everyone.
- Trust model: any boat already in a yacht session can see the
  rabbit's broadcast. Cross-yacht broadcasts use the same signed-
  bundle codec as committee-push.

**UX shape.**

- Course owner picks a boat as the rabbit before the start (probably
  by scanning that boat's QR identity, like committee-trust pairing).
- The rabbit's RaceTimerScreen has a special "I am the rabbit" mode
  badge + a high-power broadcast indicator.
- Every other boat sees the same rabbit position on a chart (Phase 2)
  with its computed start-line line.

**Acceptance criteria (draft).**

- [ ] Two boats, one in `rabbit` role and one in `competitor` role,
      both running OpenRacer. Competitor sees the rabbit's GPS within
      2 s of the rabbit moving.
- [ ] Distance-to-line readout updates in real time as the rabbit
      moves.
- [ ] OCS detection fires when the competitor crosses the projected
      line ahead of the rabbit's stern.
- [ ] Works entirely offline (no cellular, no external WiFi).

**Phase placement.** 4.5, alongside the multi-crew sync. Same
infrastructure; rabbit broadcast is one role, crew-sync is another.

---

## Multi-crew access to same yacht data

**Problem.** A yacht has multiple crew members. The helm has the phone mounted and wants big numbers. The tactician wants the start line and the wind shift history. The navigator wants the course and the mark list. Right now one person has OpenRacer open; everyone else is shouting across the boat.

**Use cases.**

1. **Helm + tactician on the same boat.** Both open OpenRacer. Both see the same armed course, same race timer counting down together, same start-line readout. If one person taps "gun sync" on the countdown, the other person's timer snaps to the same minute. If the tactician drops a mark at a gust line, the helm sees it on their screen instantly.
2. **Committee boat + fleet.** Already partly solved by the signed-bundle QR push — RC sets the course, pushes to everyone's phone before the start. This stays a one-shot push, not a live sync.
3. **Crew pre-race briefing.** Everyone in the galley loads the course and looks at it together. Nice to have.

### Architecture — three viable paths

**Path A — local peer-to-peer over WiFi / Bluetooth LE (preferred).**

- Phones on the same boat are physically within 10 metres. BLE GATT or Wi-Fi Peer-to-Peer both work.
- Elect a "boat leader" — the phone that armed the timer. Others are followers. Leader broadcasts timer + course + marks state deltas. Followers read-only for timer; can add marks which the leader merges.
- Zero cloud. Zero account. Zero subscription. Fits the offline-first posture exactly.
- **Cost:** medium. We already have BLE in the Phase 4 plan for committee push; this is an extension. A CRDT-lite merge layer (last-write-wins with vector clocks per boat) keeps it simple.
- **Dependency:** Phase 4 BLE work lands first. This is Phase 4.5 or Phase 7 (display orchestrator) territory.

**Path B — local WiFi via a boat-local hotspot or router.**

- One phone becomes an HTTP + WebSocket server. Others connect to the same SSID (boat's WiFi router, phone's hotspot, or a future Pi access point).
- Straightforward tech — Express + WS over local IP, mDNS advertisement.
- **Cost:** low for the Pi (Phase 6+) scenario where the Pi is the server. Higher when the server is a phone (battery drain, backgrounding issues on iOS).
- **Natural home:** Phase 6 — the Pi onboard is the LAN server, phones are clients.

**Path C — cloud sync via Claude Agent / Firebase / etc.**

- Rejected. Violates offline-first. No cellular at Abersoch means it doesn't work where it matters most.

### Preferred direction

**Phase 4.5 — peer-to-peer crew sync over BLE + optional WiFi LAN.**

- Reuse the signed-bundle codec already built for committee push.
- New concept: a **yacht session** — a short-lived ephemeral group keyed to the current race session id. All devices in the yacht session share state; leaving wipes the local yacht session token.
- Syncable entities: race timer (gun time, sequence, recall count), armed course (leg order, marks, rounding), and live-dropped marks added mid-race.
- **Not syncable:** GPS tracks (each phone logs its own track — merging tracks is a post-race analytics problem, not a live one).

### Open questions

- Pairing UX. QR between two phones the first time? A 6-digit code? A tap-NFC-to-pair?
- Conflict resolution. Two crew drop different marks at the same leg slot simultaneously — last-write-wins, or show both?
- Battery drain from BLE scanning on the follower devices. Does the follower need to keep scanning while the leader is also scanning for the committee push?
- Recovery when the leader's phone dies mid-race. Leader handoff to another crew member's device.

### Acceptance criteria (draft)

- [ ] Two phones on the same boat both show the same countdown to ±1 s.
- [ ] A mark dropped on phone A appears on phone B within 5 s.
- [ ] A course armed on phone A appears armed on phone B within 10 s.
- [ ] Pairing a new crew member mid-race is ≤ 30 s.
- [ ] Leaving the yacht session on a single phone does not affect other phones.
- [ ] Works entirely offline — no cellular, no external WiFi.

---

## Apple Watch + Wear OS display

**Problem.** The sailor is on the rail, phone is in a pocket, can't reach it during the final seconds of a countdown or when the tactician shouts. A wrist display for the essentials — time to gun, current leg, distance to next mark — is a natural fit.

**Scope — what the watch renders (and nothing else).**

1. Race timer countdown, monster-size, with band colour.
2. Current leg label (e.g. "WINDWARD 1 → OFFSET").
3. Distance + bearing to the active leg mark.
4. Haptic at every minute transition and at T-0 (we already do this on the phone; watch gets its own channel).
5. In cruise mode: trip distance only.

**Explicitly out of scope for v1 watch.**

- Course editing. Go to the phone.
- Mark creation. Go to the phone.
- Settings. Go to the phone.
- Chart view. Screen's too small; go to the phone.

### Architecture

**Apple Watch (iOS path):**

- WatchOS app built with **SwiftUI + a native companion target**. Expo supports this via `expo-apple-watch` community module or a native module we write ourselves.
- Watch talks to the phone app over **Watch Connectivity framework** — push messages from phone → watch with every race-state change, minimal "pull" from the watch.
- The watch app doesn't run useRaceStore locally; it mirrors a minimal subset of the state pushed by the phone.
- **Dependency:** EAS dev build. Cannot test on Expo Go. Slots into the Phase 2 EAS transition naturally.

**Wear OS (Android path):**

- WearOS app built with Jetpack Compose. Connects to the phone via the Wearable Data Layer API.
- Same state-mirror model.
- **Dependency:** separate native module work; can follow iOS by a phase.

### Preferred direction

**Phase 2.5 — Apple Watch race-timer mirror.**

- Single-screen watch app. Race countdown + one-line leg label.
- Phone pushes state on every snapshot change (250 ms cadence is too fast for watch-phone radio; batch to 1 Hz).
- Haptics on the watch at every minute transition so the sailor doesn't need to look.
- Ship without Wear OS. Follow-up phase for Android parity.

### Open questions

- Does the watch display the start-line readout (distance-to-line, OCS flag), or is that too much for a 44 mm face? Probably yes to distance-to-line, no to the rest.
- Does the watch ever work standalone without the phone? Probably no — GPS on Apple Watch Ultra is good, but course + marks live on the phone and the state-mirror model depends on a live link.
- Do we target the watch's own GPS as a backup if the phone's signal drops? Interesting but Phase 3+.
- Complication on the watch face showing seconds-to-gun, always visible. Probably yes.

### Acceptance criteria (draft)

- [ ] Watch app shows the current race countdown, updated every 1 s.
- [ ] Watch haptic fires within 500 ms of the phone haptic at each minute transition.
- [ ] Watch app updates within 2 s of a course arm / abandon / finish on the phone.
- [ ] Battery cost over a 2-hour race is under 25% of the watch's battery.
- [ ] Installable via TestFlight alongside the iOS app.

---

## Gun-sync one-tap button

Quick Phase 1.5 win from the Navionics research (see `/Research/OpenRacer - Navionics Competitor Deep-Dive.md`). When the sailor hears the 5-minute gun, they tap a large "Gun!" button and the sequence snaps to the current whole minute. Haptic confirmation. No setup, no sync sweep.

- Existing `syncToMinute` action already does this on a dedicated button press. The UX tweak is making it the dominant pre-start button and adding a louder visual treatment so it's tappable without looking.
- **Effort:** 1-2 hours.
- **Phase:** 1.5 polish bucket.

---

## General recall + postponement sequence states

Phase 1 timer knows Rule 26 (5/4/1/0) but has no AP (postponement), no individual-recall handling, no second-gun for a restart. Club race officers want this.

- Add `AP` and `individualRecall` as pre-start states in the sequence machine.
- Visual: AP flag overlay during postponement, countdown paused.
- UX: RC taps "AP" on their phone, fleet receives via committee push (or via crew-sync once Phase 4.5 ships) and timer pauses.
- **Effort:** 3-5 days; touches timer state machine, notifications, and the RC-side UI.
- **Phase:** 1.5 or Phase 2.

---

## Post-race GPX export + web replay

RaceQs was loved for this and is now abandoned. We already log 1 Hz GPS tracks to SQLite per race session. The two remaining pieces:

1. **GPX export** from a race session — local share sheet, AirDrop, save to Files, email attachment. No cloud required.
2. **Web replay viewer** — a separate static web app (simple React + MapLibre) that renders an uploaded GPX track on a chart. Hosted on GitHub Pages. Users go to `replay.openracer.app` and drop their GPX.

- **Effort:** a week. GPX export is half a day; web viewer is the bulk.
- **Phase:** 2 or 3. Not urgent — nice social proof for the club.

---

## Laylines from a manual tack angle

From Navionics research. Club racers don't have polars. They do know their boat's tack angle (typically 80-90° on a cruiser-racer, 75° on a good dinghy, 70° on a sportsboat).

- User sets `tackAngleDegrees` in Settings (defaults to 88°).
- When armed to a windward mark with known wind direction, app draws two lay lines (port tack layline + starboard tack layline) on the chart view.
- Needs a chart view — dependency on MapLibre landing in Phase 2.
- **Phase:** 2, right after MapLibre.

---

## Tidal current overlay

From Navionics research. Cardigan Bay tides matter at Abersoch. Navionics' animated current arrows are their best tactical feature.

- Data source: **XTide harmonic constants** (public domain, offline). Compute current at a point + time without a network.
- Render: animated SVG arrows at a grid of points across the chart view, direction + magnitude, scrubable forward in time.
- Needs MapLibre + a chart view.
- **Phase:** 2 or 3.
