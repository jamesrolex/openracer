/**
 * The three connectivity regimes OpenRacer designs around.
 *
 * See skills/offline-first/SKILL.md — every feature declares behaviour in each
 * of these modes. GPS works in all three (satellite-based); cloud only amplifies.
 */
export type ConnectivityMode = 'offline' | 'patchy' | 'constant';
