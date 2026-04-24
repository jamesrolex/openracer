/**
 * Connectivity mode detector. Wraps expo-network.
 *
 * For Phase 0 the 'patchy' vs 'constant' distinction is approximated by
 * network type:
 * - no network or unreachable  → 'offline'
 * - cellular (mobile data)     → 'patchy' (assume signal comes and goes)
 * - wifi / ethernet / other    → 'constant'
 *
 * Real bandwidth testing and Starlink detection are deferred — see
 * skills/offline-first/SKILL.md for the long-term design.
 */

import * as Network from 'expo-network';
import { useEffect, useState } from 'react';

import type { ConnectivityMode } from '../types/connectivity';

const POLL_INTERVAL_MS = 5000;

export function useConnectivity(): ConnectivityMode {
  const [mode, setMode] = useState<ConnectivityMode>('offline');

  useEffect(() => {
    let cancelled = false;

    async function probe() {
      try {
        const state = await Network.getNetworkStateAsync();
        if (cancelled) return;
        setMode(deriveMode(state));
      } catch {
        if (!cancelled) setMode('offline');
      }
    }

    probe();
    const interval = setInterval(probe, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return mode;
}

function deriveMode(state: Network.NetworkState): ConnectivityMode {
  if (!state.isConnected || !state.isInternetReachable) return 'offline';
  if (state.type === Network.NetworkStateType.CELLULAR) return 'patchy';
  return 'constant';
}
