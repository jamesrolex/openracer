# Offline-first architecture

Read this before implementing any feature that could touch the network. Every feature in OpenRacer must work with no connection and amplify gracefully when bandwidth is available.

## When to use this skill

- Designing any feature that reads or writes remote data
- Implementing anything that calls an API
- Handling weather, tides, AI, fleet data, or any external service
- Wiring up sync, caching, or background fetch
- Reviewing whether a proposed feature fits the architecture

## The core principle

**GPS is satellite-based. Phone sensors are local. Marine instruments are on the boat.** Almost everything that matters for sailing is achievable with zero connectivity — and works better with connectivity.

We don't "add offline support" as an afterthought. Every feature is designed to work at three connectivity levels from day one.

## The three connectivity modes

| Mode | Typical scenario | What works |
|---|---|---|
| **Offline** | Cardigan Bay, mid-Channel, rural UK coast | Core racing, cached data, local AI |
| **Patchy** | Most club venues, intermittent 4G | Offline-first + queued cloud bursts |
| **Constant** | Starlink, in-harbour, coastal 5G | Real-time AI, live AIS, fleet tracking |

A feature's design must explicitly answer: what does this do in each of the three modes?

## The feature design contract

Every feature that touches external data writes three behaviours:

```typescript
// Example: weather forecast feature

function useWeatherForecast(): WeatherData {
  const mode = useConnectivity();

  switch (mode) {
    case 'offline':
      // Return cached data, mark stale if older than 6 hours
      return getCachedWeather();

    case 'patchy':
      // Return cached, kick off background refresh
      enqueueRefresh('weather');
      return getCachedWeather();

    case 'constant':
      // Live fetch, subscribe to updates
      return liveWeather();
  }
}
```

This pattern repeats across every feature. Make it explicit and easy to find.

## Architectural rules

### 1. Never block on network

Every network call has either a local fallback or returns immediately with a pending-update marker. Racing data must never wait.

**Bad:**
```typescript
const tide = await fetchTideFromUKHO(); // Blocks for 5s on bad signal
setTideDisplay(tide);
```

**Good:**
```typescript
setTideDisplay(getCachedTide()); // Immediate, always
refreshTideInBackground(); // Fire-and-forget, updates when ready
```

### 2. Local-first writes

User actions commit to local storage first, sync to cloud second. User never waits for the cloud to know what they just did.

### 3. Queue cloud requests

Any outbound cloud request goes through a persisted queue. Executes when signal available, ordered by priority. Survives app restart.

```typescript
// Persisted queue with priority lanes
enum QueuePriority {
  CRITICAL = 0,  // MOB position broadcast
  HIGH = 1,      // Race finish debrief
  NORMAL = 2,    // Session sync
  LOW = 3,       // Analytics ping
}
```

### 4. Opportunistic sync

Background sync when signal returns, automatically. User never triggers manually. Use expo-background-fetch / WorkManager where possible.

### 5. Show freshness, don't alarm

Stale cached data shows a subtle badge ("updated 2h ago"). Never a full-screen modal. Never "you're offline" in alarming red. Offline is the normal racing state.

Racing data (GPS, speed, heading) is ALWAYS live from sensors — never shows stale.

### 6. Local models available

On-device AI (Llama 3.2 3B) ensures offline Q&A and debriefs work. When cloud is available, it upgrades the response. Same API surface, different backend.

### 7. Test in airplane mode

Every feature PR must be tested in aeroplane mode. CI should run all feature tests with network disabled. Phase 1 exit gate specifically: 2-hour race completed in aeroplane mode, no degraded UX visible.

## Feature catalogue by connectivity tier

Use this table as the template for new features. If you can't fill in all three columns, the feature isn't designed yet.

### Core — fully offline always

| Feature | Offline | Patchy | Constant |
|---|---|---|---|
| GPS, SOG, COG | Live sensor | Live sensor | Live sensor |
| Marks, course, timer | Full | Full | Full |
| Start line, laylines | Full | Full | Full |
| VMG, polar | Full | Full | Full |
| Tidal (XTide) | Full | Full + UKHO augment | Full + UKHO live |
| Weather | Cached | Cached + refresh | Live updates |
| Gust detection | Full | Full | Full |
| Local AI Q&A | Full (Llama 3.2) | Full or cloud | Cloud (Claude) |

### Enhanced by patchy signal

| Feature | Offline | Patchy | Constant |
|---|---|---|---|
| Cloud AI debrief | Queued | 30s response | 15s with mid-race context |
| Weather refresh | Cached | Background refresh | Live subscription |
| UKHO tide live | Cached | Fetch on app launch | Live |
| Cross-device sync | Queued | Bursts when signal | Live |
| Seasonal mark update | Cached | Fetch on launch | Live |

### Amplified by constant connection (Starlink)

| Feature | Offline | Patchy | Constant |
|---|---|---|---|
| Live AI coaching mid-race | ❌ | ❌ | Streaming voice + text |
| Live AIS via MCP | Cached if any | ❌ | Live fleet overlay |
| Fleet live tracking | ❌ | ❌ | Other boats on chart |
| Streaming telemetry to shore | ❌ | ❌ | Full data stream |
| Live ECMWF model updates | Cached | ❌ | Every 6h refresh |
| Video overlay streaming | ❌ | ❌ | Streaming |
| Cross-boat tactical sharing | ❌ | ❌ | Anonymised, opt-in |

## Storage architecture

### What's stored where

| Data type | Storage | Reason |
|---|---|---|
| User settings | expo-sqlite | Persistence, queryable |
| Session tracks | expo-sqlite | Analytics queries, many sessions |
| Marks | expo-sqlite | Fast lookup, tier filtering |
| Polars | expo-sqlite | Per-boat, queryable |
| Cached API responses | AsyncStorage or SQLite | Short-lived, key-value |
| Offline chart tiles | Filesystem (MBTiles) | Large binary, spatial indexed |
| Queued cloud requests | expo-sqlite | Survives restart, ordered |
| Debrief text | expo-sqlite | Small, versioned |

### Chart tile management

Pre-downloaded area packages. Smart prompts when signal is good:
- "Near edge of downloaded area — extend before leaving?"
- "Route crosses undownloaded areas — download now?"
- "Still online at marina — top up today's area?"

Auto-cache: ~5nm radius of current GPS in background when signal is strong. Covers the "I forgot to download but I'm still in the marina" case.

## Implementation patterns

### Pattern 1 — Stale-while-revalidate

Default for weather, tides, mark library updates.

```typescript
function useStaleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  cacheKey: string
): { data: T | null; isStale: boolean; ageSeconds: number } {
  const cached = getCachedData<T>(cacheKey);
  const mode = useConnectivity();

  if (mode !== 'offline') {
    enqueueRefresh(key, fetcher, cacheKey);
  }

  return {
    data: cached?.data ?? null,
    isStale: cached ? (Date.now() - cached.timestamp) > CACHE_TTL : true,
    ageSeconds: cached ? (Date.now() - cached.timestamp) / 1000 : Infinity,
  };
}
```

### Pattern 2 — Queue-and-forget

Default for debrief generation, cloud sync, analytics.

```typescript
async function generateDebrief(session: Session): Promise<Debrief> {
  // Generate local version immediately
  const local = await generateDebriefLocal(session);
  saveDebrief({ ...local, source: 'local' });

  // Queue cloud upgrade
  cloudQueue.enqueue({
    task: 'debrief-upgrade',
    sessionId: session.id,
    priority: QueuePriority.HIGH,
  });

  return local;
}

// Later, when queue processes:
async function processDebriefUpgrade(sessionId: string) {
  const cloud = await generateDebriefCloud(sessionId);
  saveDebrief({ ...cloud, source: 'cloud' }); // Replaces local version
}
```

### Pattern 3 — Live subscription with fallback

Default for constant-connection enhancements.

```typescript
function useLiveFleet(): FleetData {
  const mode = useConnectivity();
  const [fleet, setFleet] = useState<FleetData>({ boats: [] });

  useEffect(() => {
    if (mode !== 'constant') return;

    const sub = fleetStream.subscribe(data => setFleet(data));
    return () => sub.unsubscribe();
  }, [mode]);

  return fleet;
}
```

## What NOT to do

- Don't `await` a network call on the main user interaction path
- Don't show a loading spinner for data that should be cached
- Don't display "offline" as an error state
- Don't require network for racing features
- Don't assume signal will be available when the user needs it most
- Don't let a queued request block user interaction
- Don't silently drop failed cloud requests — queue and retry
- Don't invent new storage mechanisms — use the ones in the table above
- Don't cache forever — TTLs exist for a reason

## The Starlink-era upgrade path

Constant connection is not just "offline mode without the limitations." It's a qualitatively different product:

- Mid-race AI coaching streaming in real time
- Live AIS overlay via MCP tool queries
- Fleet positions broadcasting every 2 seconds
- Shore-based coaching via telemetry stream
- Live weather model updates mid-leg

When designing features, always ask: "if this user has Starlink, what could we do that's impossible offline?" That's where the Grand Prix racing segment lives.

## Testing checklist for every feature

- [ ] Works in aeroplane mode (primary test)
- [ ] Works with airplane mode toggled mid-session (don't crash on signal change)
- [ ] Queued requests survive app restart
- [ ] Cached data shows correct freshness
- [ ] Live data never shows stale
- [ ] Cloud upgrades replace local cleanly (no flicker, no duplicate)
- [ ] Critical actions (MOB, race start) work offline
- [ ] Non-critical actions queue gracefully offline

## Summary

Three modes. Every feature declares all three behaviours. Local first, cloud amplifies. Never block on network. Test offline by default.

If a feature can't articulate what it does offline, patchy, and constant — it's not designed yet.
