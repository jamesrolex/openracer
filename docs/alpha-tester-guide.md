# OpenRacer alpha tester guide

Thank you for helping shape OpenRacer. This is a **pre-release alpha** — rough edges
are expected, and your feedback directly steers what happens next.

## What you're testing

- **Course entry** — five ways to build a course: library pick, QR committee push,
  drop-at-GPS, bearing + distance, point-at-mark (compass + triangulation).
- **Race timer** — time-anchored 3-minute sequence with locked-screen notifications
  at T-5, T-4, T-1, T-0 and haptics on every minute.
- **Start line** — live distance-to-line and time-to-line while the timer runs.
- **Track logging** — positions are recorded once the gun fires. View past races
  from Settings → Race history.

Everything works **offline**. You do not need a cellular signal at the venue.

## Install

### iOS (TestFlight)

1. You'll receive an email invite from TestFlight. Accept it.
2. Install the **TestFlight** app from the App Store if you don't have it.
3. Open TestFlight → OpenRacer → Install.
4. First launch will ask for location access. Tap **Allow While Using App**.

### Android (APK)

1. You'll receive an APK link.
2. On your Android phone: Settings → Security → allow installs from this source.
3. Download the APK and tap it to install.
4. First launch will ask for location access. Tap **While using the app**.

## The 3-minute test

The core use case. Target: from VHF course announcement to timer armed in **under 3
minutes**, with no phone signal.

1. Put your phone in **aeroplane mode**. WiFi and cellular both off.
2. Open OpenRacer. Dismiss the onboarding cards.
3. Tap **Build course**. Pick a template (Windward-Leeward is the common one).
4. For each leg, tap the slot and pick a mark from the library, or use one of the
   other input methods.
5. Once every required slot is filled, tap **Arm timer**.
6. On the timer screen, tap **Sync** when the 3-minute warning goes up on the
   committee boat.
7. Watch the countdown; the gun haptic fires at T-0. If you drift across the line
   early, the start-line readout flashes red.

Time it with a stopwatch on your watch. Report what slowed you down.

## What to test specifically

- **The 3-minute test** — run it five times across three different course templates.
  Each time, note the wall-clock time and what took longest.
- **Compass-based point-at-mark** — this is the experimental method. Stand near a
  known mark, take two sightings from positions ≥20 m apart, and compare the saved
  position to the real GPS fix of the mark. How far off is it?
- **Locked-screen notifications** — arm the timer, lock your phone, put it in your
  pocket. Do you get the T-5, T-4, T-1, T-0 alerts? Do the haptics fire?
- **Kill-mid-race resilience** — start a race, force-quit OpenRacer during the
  countdown. Re-open it. The timer should still know where in the sequence it is.
- **Airplane mode** — every flow above must work with the phone in aeroplane mode.
  If anything breaks without signal, that's a bug.

## How to report a bug

Pick the path with lowest friction for you.

### Option 1 — GitHub issue (preferred)

1. Go to [github.com/jamesrolex/openracer/issues](https://github.com/jamesrolex/openracer/issues/new).
2. Title: one short sentence — what you did, what went wrong.
3. Body: answer these four questions:
   - **What did you do?** (step-by-step, so someone else can reproduce)
   - **What did you expect?**
   - **What happened instead?**
   - **What phone are you on?** (model + OS version)
4. Screenshots are gold. Attach them.

### Option 2 — WhatsApp / text

Message James directly. Same four questions, short form. A screenshot and a one-
liner is plenty.

## What we will NOT fix in alpha

To keep the scope honest, some known gaps are deliberate:

- **No charts yet** — the chart-tap and chart-seamark input methods are Phase 2.
- **No BLE / mDNS committee push** — QR is the standin for Phase 1. Phase 2 adds
  auto-discovery.
- **No polars or VMG** — Phase 2.
- **No AI debrief or "why did we lose"** — Phase 4+.
- **No weather, tidal, or AIS** — Phase 3+.
- **No cross-device sync** — your library and race history are local-only.

If something on that list matters to you, please say so. Priority is decided by
what alpha testers care about most.

## Safety note

OpenRacer is not certified for navigation. Do not use it as your only source of
situational awareness. Keep a good lookout and follow IRPCS.

## Thank you

Seriously — testing alpha software is thankless work. If you get three races in
with this and it saves you time compared to your current setup, we're in business.
