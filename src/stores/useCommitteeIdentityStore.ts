/**
 * Local committee identity. Present on every device, but only used when
 * the sailor is running the committee role (generating course QRs).
 *
 * Private key is persisted via the Zustand `persist` SQLite adapter for
 * Phase 1 simplicity. Phase B should migrate to expo-secure-store (iOS
 * Keychain / Android Keystore) — tracked in docs/phase-1-plan.md.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { generateKeyPair } from '../domain/committeeKey';

import { sqliteStorage } from './sqliteStorage';

export interface CommitteeIdentity {
  committeeId: string;
  committeeName: string;
  privateKey: string;
  publicKey: string;
}

export interface CommitteeIdentityState {
  identity: CommitteeIdentity | null;
}

export interface CommitteeIdentityActions {
  create: (committeeId: string, committeeName: string) => CommitteeIdentity;
  rename: (committeeName: string) => void;
  regenerateKey: () => CommitteeIdentity;
  clear: () => void;
}

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function buildIdentity(committeeId: string, committeeName: string): CommitteeIdentity {
  const keys = generateKeyPair();
  return {
    committeeId: slugify(committeeId) || 'committee',
    committeeName: committeeName.trim() || 'My committee',
    privateKey: keys.privateKey,
    publicKey: keys.publicKey,
  };
}

export const useCommitteeIdentityStore = create<
  CommitteeIdentityState & CommitteeIdentityActions
>()(
  persist(
    (set, get) => ({
      identity: null,
      create: (committeeId, committeeName) => {
        const identity = buildIdentity(committeeId, committeeName);
        set({ identity });
        return identity;
      },
      rename: (committeeName) => {
        const current = get().identity;
        if (!current) return;
        set({ identity: { ...current, committeeName: committeeName.trim() } });
      },
      regenerateKey: () => {
        const current = get().identity ?? buildIdentity('committee', 'My committee');
        const keys = generateKeyPair();
        const identity: CommitteeIdentity = {
          ...current,
          privateKey: keys.privateKey,
          publicKey: keys.publicKey,
        };
        set({ identity });
        return identity;
      },
      clear: () => set({ identity: null }),
    }),
    {
      name: 'openracer.committee-identity',
      storage: sqliteStorage<CommitteeIdentityState>(),
      partialize: (state): CommitteeIdentityState => ({ identity: state.identity }),
    },
  ),
);
