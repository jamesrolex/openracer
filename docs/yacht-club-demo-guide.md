# Yacht club demo — how to show OpenRacer on your iPhone

**For: James. Audience: club members at Abersoch YC.**

Single-page guide to getting the app cached on your phone and telling
its story to fellow sailors.

## Before you leave the house

You need these three things, done in this order:

1. **Expo Go installed** (you already have it).
2. **The app bundle downloaded and cached on your phone.** You only
   need to do this once per code change.
3. **Aeroplane-mode test at home** to prove it really works offline
   before you leave.

### Step-by-step (5 minutes, one-time)

1. Open Expo Go on your iPhone.
2. On the **Projects** tab, tap the **openracer** entry — or scan the
   QR code I gave you in chat.
3. Wait for the blue progress bar to finish — "Downloading JavaScript
   bundle…" will appear briefly.
4. **Wait until you see the Home screen with a GPS fix** (SOG/COG
   filling in with real numbers). This means the bundle is fully
   loaded into memory and cached to disk.
5. **Lock the phone.** Do not force-quit Expo Go.
6. Go to Settings → Aeroplane Mode → ON.
7. Unlock phone. Open Expo Go again. Tap **openracer**. It should
   load instantly and the GPS should tick up within 30-60 seconds.

If step 7 fails at home, it will fail at the club. Come back and
debug.

## At the yacht club

### The 60-second demo

Walk up to a club member, hand them the phone, and say this:

> "This is an open-source racing app I've been building. No signal,
> no subscription, no instruments — works on any phone. It's got a
> start timer, a start-line readout, and we just added a course-
> progress bar. Try the start timer."

### The 5-minute demo

- **Home screen** — show GPS, compass, the trip odometer. "Trip
  distance picks up where you left off. Handy for cruising."
- **Mark Library** → show the seeded Abersoch marks. "These come
  with the app. No download, no subscription."
- **Build course** → pick the Windward-Leeward template, pick marks
  from the library. "Thirty seconds from VHF to a ready course."
- **Arm timer** → the countdown starts. Mention the haptics: "phone
  buzzes every minute — you don't have to look at it."
- **Point at mark** → show the new compass dial. "New method for
  ad-hoc committee marks — point, walk 20 metres across, point again,
  phone triangulates."
- **Commit boat push** → show the Scan QR flow. "Committee boat can
  push the course to every boat's phone via QR code. No VHF
  repetition, no chalkboard."

### The story to tell

> "Every other sailing app I've tried needs cellular signal or a
> subscription or both. Navionics is £40 a year and has zero racing
> features. iRegatta's Android version hasn't been updated since
> 2015. The pro apps are £600+ of hardware or £1,000 desktop
> software. Club racers have been underserved for twenty years.
> This is an attempt to fix that — free, open source, works in a
> field with no signal. Built for Abersoch specifically."

### Common questions sailors will ask

- **"How much does it cost?"** Free. Open-source. Always will be.
  No account, no login.
- **"Does it work with Garmin / Navionics?"** Not yet. Phase 6+ for
  plotter integration. The phone does everything in Phase 1.
- **"When can I install it?"** TestFlight once we do the Apple
  Developer signup (£79/year of James's money). Android APK sooner
  if someone has Android. (Today: just James's phone.)
- **"Who else is using it?"** Nobody yet — you're the first audience
  outside the project. Alpha tester spots are open.

## Troubleshooting

**"The app is stuck on a white screen."**
Kill Expo Go (swipe up, swipe Expo Go away). Re-open. If still white,
you're offline AND the cache is corrupt. Go back onto WiFi and
re-load from the QR code.

**"SOG/COG are showing em-dashes."**
GPS hasn't got a fix yet. Normal indoors, around tall buildings, or
in a marina under a shed. Step outside for 30 seconds.

**"The countdown is in red."**
You're in the final minute before the gun. This is correct.

**"Nothing happens when I tap Build Course."**
Navigation's frozen. Rare but possible. Kill Expo Go, re-open, your
mark library and past sessions are preserved in SQLite.

## After the club

**Tell James**:
- Who you showed it to and what they said (even the rude bits — we
  want the honest feedback).
- What they tried to do that didn't work.
- What they asked for that we don't have yet.

That goes into `docs/bugs.md` (for bugs) or `docs/future-features.md`
(for features).

---

**Build note:** this demo is running a cached JavaScript bundle in
Expo Go. It's the full app, not a reduced demo. Everything in the
repo at commit `$(git rev-parse --short HEAD)` works on your phone.
