# Dad — how to join Pantera on OpenRacer

A 5-minute walk-through. You only do this once at the start of the
season; after that the app remembers everything.

---

## What you’ll end up with

- The Pantera mark library on your iPhone (start, windward, leeward,
  pin — whatever James has set up at SCYC)
- The polar table for the boat (so the app can show target boatspeed)
- The ability to scan a race-share QR before each Wednesday-night
  start so your timer counts down to the same gun as James’s

You don’t need to set anything up beyond installing the app.

---

## Step 1 — Install Expo Go

This is just the shell that runs OpenRacer while we’re still
testing.

1. Open the App Store on your iPhone.
2. Search for **Expo Go**.
3. Install. (Free, no sign-in needed.)

---

## Step 2 — Open OpenRacer in Expo Go

James will text you a URL like
`https://expo.dev/@jamesrolex/openracer?serverType=published`.

1. Tap that URL on your iPhone.
2. iPhone asks "Open in Expo Go?" — tap **Open**.
3. Wait for the loading bar (about 30 seconds the first time).
4. Allow location when asked. Allow notifications too — that's how
   you'll hear the gun warnings with your phone screen off.
5. Tap **Get started** on the welcome cards.

You should now see the OpenRacer Home screen with your boat speed
and heading at the top.

---

## Step 3 — Trust James (one-time)

So your phone knows bundles signed by James are real and can verify
them.

1. Get James to open his app → **Settings → Me → My signing identity**.
2. He’ll show you a QR code on his screen.
3. On your phone: **Settings → Yacht clubs & trusted people → Scan QR**.
4. Aim the camera at his QR. The app shows "Trust James Coop?" — tap
   **Trust**.

Done. You only ever do this once unless he changes his keypair.

---

## Step 4 — Join Pantera (one-time)

Pulls Pantera’s saved buoys + polar table onto your phone.

1. James opens his app → **Settings → My boat (Pantera) → Invite crew (share boat)**.
2. He shows you the QR code on his screen.
3. On your phone: **My sailing log** (or **Settings → Yacht clubs & trusted people → Scan QR**) → tap **+ Join a boat**.
4. Aim camera at his QR. The app shows "Join Pantera?" — tap **Join**.

Now your Mark library has Pantera’s buoys. Your polar is set. You’re
crew.

---

## Step 5 — Before each Wednesday night race

James shares the live race state — gun time + course + wind
direction — with one extra QR scan.

1. James arms the timer on his phone (or accepts a course push from
   SCYC if they’re running it).
2. He taps **⇪ Share with crew** at the bottom of the Race Timer.
3. He shows you the QR.
4. On your phone, **Settings → Scan QR** → aim → "Join Wednesday
   evening?" — tap **Join**.

Your timer arms with the same gun, same course. Both phones count
down together.

---

## Things you might want to know

- **Aeroplane mode is fine.** Once you’ve loaded the app on home
  WiFi, GPS works without any signal. At Abersoch you’ve got no
  cellular at the marks; the app doesn’t need it.
- **The countdown haptics buzz at every minute.** You can keep your
  phone in your pocket; the wrist taps tell you where you are.
- **If James adjusts the gun ±1 minute mid-pre-start**, your phone
  doesn’t follow automatically yet (Phase 4.5). Each crew member
  taps their own GUN! button to re-sync if the RC re-fires.
- **Your sailing log builds up across boats.** Settings → My
  sailing log shows your lifetime miles and every boat you’ve
  joined.

---

## If anything goes weird

Text James. He’ll need:
- What you tapped (which screen, which button)
- What appeared (or didn’t)
- A screenshot if you can manage one (volume-up + side button on
  iPhone)

Common gotchas:
- "Camera permission denied" — Settings → Privacy → Camera → Expo
  Go: turn it on
- "Location denied" — Settings → Privacy → Location Services → Expo
  Go: While using app
- "Bundle is not valid JSON" — try scanning again, sometimes the
  camera doesn’t lock on the first try
