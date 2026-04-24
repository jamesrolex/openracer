/**
 * Schedule local notifications for the standard start sequence.
 *
 * Pure wrappers around expo-notifications. The Race screen calls
 * `scheduleForStart` when arming and `cancelAll` on abandon / reset.
 * Sequence notifications fire even if the app is backgrounded.
 *
 * Phase 1 uses best-effort local notifications (no remote push, no
 * FCM, no APNs server cert). That's enough for the 3-minute exit gate
 * — a sailor with the phone in their pocket still hears the signals.
 */

import * as Notifications from 'expo-notifications';

import type { StartSequence } from '../types/race';

const NOTIFICATION_PREFIX = 'openracer-race-signal-';

export async function requestNotificationPermissions(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (!settings.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return req.granted;
}

export async function cancelAllRaceNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ids = scheduled
    .filter((s) => s.identifier.startsWith(NOTIFICATION_PREFIX))
    .map((s) => s.identifier);
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

const SIGNAL_COPY: Record<'warning' | 'preparatory' | 'one-minute' | 'start', {
  title: string;
  body: string;
}> = {
  warning: { title: 'Warning signal', body: '5 minutes. Class flag up.' },
  preparatory: { title: 'Preparatory signal', body: '4 minutes. P flag up.' },
  'one-minute': { title: 'One minute', body: 'One-minute signal.' },
  start: { title: 'Start!', body: "It's the gun. Go." },
};

/**
 * Schedule the four standard signals at times derived from `sequenceStart`.
 * Returns the ids actually scheduled (future-only — signals that would
 * fire in the past are skipped so we don't spam).
 */
export async function scheduleForStart(
  sequenceStart: Date,
  sequence: StartSequence,
): Promise<string[]> {
  await cancelAllRaceNotifications();

  const entries: {
    key: 'warning' | 'preparatory' | 'one-minute' | 'start';
    atMs: number;
  }[] = [
    { key: 'warning', atMs: sequence.warningAtMs },
    { key: 'preparatory', atMs: sequence.preparatoryAtMs },
    { key: 'one-minute', atMs: sequence.oneMinuteAtMs },
    { key: 'start', atMs: sequence.startAtMs },
  ];

  const now = Date.now();
  const scheduled: string[] = [];
  for (const { key, atMs } of entries) {
    const fireAt = sequenceStart.getTime() + atMs;
    if (fireAt <= now + 500) continue; // skip past / immediate
    const id = `${NOTIFICATION_PREFIX}${key}`;
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: SIGNAL_COPY[key].title,
        body: SIGNAL_COPY[key].body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(fireAt),
      },
    });
    scheduled.push(id);
  }
  return scheduled;
}

/**
 * Set the default handler so foreground notifications still show + sound.
 * Call once from App.tsx.
 */
export function installForegroundHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
