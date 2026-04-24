# Dev-build setup (Phase B — BLE + mDNS)

**TL;DR:** Phase A of Week 4 (QR-based committee push + full signing /
ingest logic) works in Expo Go right now. Phase B upgrades the
transport to BLE + mDNS for a frictionless over-the-air exchange —
this doc is the runbook for when you're ready to commit.

## Why we need a dev build

Expo Go bundles a fixed set of native modules. BLE and mDNS aren't in
that set, so any build that `import`s `react-native-ble-plx` or
`react-native-zeroconf` will crash on Expo Go with a red screen. The
answer is an **EAS dev build** — a custom native shell that includes
our extra modules, installed once per device. Fast JS reload still
works; native changes rebuild (~5-10 min via EAS, free tier).

## What you need before starting

- **macOS** with ≥40 GB free (Xcode + simulators are huge)
- **Expo account** — free: [expo.dev](https://expo.dev) → sign in
- **Apple Developer Program membership** — $99/year, required to install
  a dev build on your physical iPhone. (TestFlight alternative for the
  Phase 1 alpha doesn't need this.)
- **Android device OR emulator** — for Android dev builds. No paid
  account needed; sideloading APKs is free.
- **A second test device** — for the committee → sailor round-trip
  test. A spare phone, an old iPad, or a second person's phone for an
  hour.

Budget roughly **one working day** for the first full dev build, most
of it watching installers. Subsequent builds take 5-10 min via EAS.

## Step-by-step

### 1. Install the heavy tools

```bash
# Xcode — download from App Store or Apple Developer portal
# Accept the licence on first launch
sudo xcodebuild -license accept

# Command line tools
xcode-select --install

# Android Studio — https://developer.android.com/studio
# Open once, let it install SDKs, then:
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools' >> ~/.zshrc
source ~/.zshrc

# Verify
xcodebuild -version
adb --version
```

### 2. Install the EAS CLI + log in

```bash
npm install -g eas-cli
eas login
```

### 3. Create the EAS project

From the repo root:

```bash
eas init
```

Accept the default project name (`openracer`). This writes an `eas.json`
with the `development` / `preview` / `production` profiles. Commit that
file — the rest of the project expects it from here on.

### 4. Add the native modules

```bash
npx expo install react-native-ble-plx react-native-zeroconf
```

We also need BLE permissions in `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSBluetoothAlwaysUsageDescription":
          "OpenRacer uses Bluetooth to receive race courses from the committee boat.",
        "NSBluetoothPeripheralUsageDescription":
          "OpenRacer uses Bluetooth to receive race courses from the committee boat.",
        "NSLocalNetworkUsageDescription":
          "OpenRacer discovers committee boats on the local WiFi network.",
        "NSBonjourServices": ["_openracer-course._tcp"]
      }
    },
    "android": {
      "permissions": [
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.BLUETOOTH_ADVERTISE",
        "android.permission.ACCESS_FINE_LOCATION"
      ]
    }
  }
}
```

### 5. Build the dev client

```bash
# iOS — needs Apple Developer membership
eas build --profile development --platform ios

# Android — free
eas build --profile development --platform android
```

Each kicks off an EAS cloud build. Free tier gives 30 iOS + 30 Android
builds per month — plenty. Outputs:

- iOS → `.ipa` you install via the QR on the build page (requires
  device UDID registered in Expo; the CLI walks you through)
- Android → `.apk` you install via the QR on the build page (allow
  "Install unknown apps" from your browser)

### 6. Launch Metro in dev-client mode

```bash
npx expo start --dev-client --tunnel
```

Open the newly-installed OpenRacer app on your phone (not Expo Go!)
and scan the QR. From now on the workflow matches Expo Go: Cmd-R to
reload, shake to open dev menu, etc.

### 7. Verify BLE + mDNS on two devices

- Put both devices on the same WiFi
- On one phone (the "committee"), run the `scripts/broadcast-test-course.ts`
  harness that lands with the Phase B commits
- On the other phone, open CourseEntry — the detection banner should appear
- Accept → course populates in one tap

### 8. Document any gotchas

Append here. Common ones we'll hit:

- `NSLocalNetworkUsageDescription` prompt doesn't appear → reinstall app
- Android BLE permissions revoked after OS update → in-app re-prompt
- EAS build fails on `pod install` → bump `expo` patch version, rebuild

## What lives in Phase A vs Phase B

| Piece | Phase A (today, Expo Go) | Phase B (post-dev-build) |
|---|---|---|
| Bundle schema + codec | ✅ `src/domain/coursePush.ts` | — |
| ECDSA sign / verify | ✅ `src/domain/committeeKey.ts` | — |
| Trust list + repo | ✅ `src/stores/committeeTrustRepo.ts` | — |
| Ingest (bundle → SQLite) | ✅ `src/domain/coursePushIngest.ts` | — |
| Receiver UI | ✅ QR-camera scan (expo-camera) | + mDNS / BLE banner |
| Broadcaster UI | ✅ QR-code display | + mDNS / BLE broadcast |
| Transport | ✅ QR code (offline, same trust model) | + mDNS, + BLE fallback |

The QR path in Phase A is production-quality, not a stub. BLE + mDNS
in Phase B add convenience (no camera required) but don't change the
trust or bundle model — they're alternative pipes for the same
signed payload.

## Cost summary

| Item | Cost | When |
|---|---|---|
| Expo account | Free | Day 1 |
| EAS builds | Free (30/month each platform) | Day 1 |
| Apple Developer Program | $99 / year | When you want iOS dev-build on your own phone |
| Android dev build | Free | Day 1 |
| Xcode + Android Studio | Free | ~2 hours install |

If the Phase 1 alpha lands before you're ready to pay Apple, ship
the iOS alpha via TestFlight (free for up to 100 testers via the
developer's existing developer account). The dev-build path is purely
for engineering ergonomics, not distribution.
