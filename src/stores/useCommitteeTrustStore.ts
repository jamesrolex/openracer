/**
 * Committee trust store — thin wrapper over committeeTrustRepo so screens
 * can subscribe to the trusted-committees list without re-querying SQLite
 * on every render.
 */

import { create } from 'zustand';

import type { CommitteeTrust } from '../types/coursePush';

import {
  addTrustedCommittee,
  getTrustedCommittee,
  listTrustedCommittees,
  revokeTrustedCommittee,
} from './committeeTrustRepo';

export interface CommitteeTrustState {
  trusted: CommitteeTrust[];
  isLoading: boolean;
  error: string | null;
}

export interface CommitteeTrustActions {
  refresh: () => Promise<void>;
  add: (entry: Omit<CommitteeTrust, 'addedAt'>) => Promise<CommitteeTrust>;
  revoke: (committeeId: string) => Promise<void>;
  lookup: (committeeId: string) => Promise<CommitteeTrust | null>;
}

const initial: CommitteeTrustState = {
  trusted: [],
  isLoading: false,
  error: null,
};

export const useCommitteeTrustStore = create<
  CommitteeTrustState & CommitteeTrustActions
>((set, get) => ({
  ...initial,

  refresh: async () => {
    set({ isLoading: true, error: null });
    try {
      const trusted = await listTrustedCommittees();
      set({ trusted, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: toMessage(err) });
    }
  },

  add: async (entry) => {
    const added = await addTrustedCommittee(entry);
    await get().refresh();
    return added;
  },

  revoke: async (committeeId) => {
    await revokeTrustedCommittee(committeeId);
    await get().refresh();
  },

  lookup: async (committeeId) => {
    return getTrustedCommittee(committeeId);
  },
}));

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
