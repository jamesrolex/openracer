/**
 * ScanCoursePushScreen — camera-based QR scanner for committee push.
 *
 * Dispatches on QR kind:
 *   - `openracer-trust`: confirm + add to trust list
 *   - `openracer-bundle`: verify signature → look up committee in trust
 *     list → ingest into SQLite → open the freshly-created draft
 *
 * Pure scanner screen — no mDNS / BLE here. Phase B adds a parallel
 * passive-detection banner on CourseEntryScreen; this screen stays the
 * definitive manual fallback.
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';

import {
  decodeBoatProfile,
  decodeBundle,
  decodeFinishRecord,
  decodeRaceBundle,
  describeBoatProfileDecodeError,
  describeDecodeError,
  describeFinishDecodeError,
  describeRaceDecodeError,
} from '../domain/coursePush';
import {
  ingestBoatProfile,
  ingestCoursePushBundle,
  ingestRaceBundle,
} from '../domain/coursePushIngest';
import { decodeQr, describeQrDecodeError } from '../domain/qrEnvelope';
import type { RootStackScreenProps } from '../navigation';
import { recordFinish } from '../stores/leaderboardRepo';
import { useCommitteeTrustStore } from '../stores/useCommitteeTrustStore';
import { useCoursesStore } from '../stores/useCoursesStore';
import { useMarksStore } from '../stores/useMarksStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';

type Status =
  | { kind: 'scanning' }
  | { kind: 'processing'; message: string }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export function ScanCoursePushScreen({
  navigation,
}: RootStackScreenProps<'ScanCoursePush'>) {
  const themeVariant = useSettingsStore((state) => state.theme);
  const theme = getTheme(themeVariant);

  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<Status>({ kind: 'scanning' });
  const lastHandled = useRef<string | null>(null);

  const addTrust = useCommitteeTrustStore((s) => s.add);
  const lookupTrust = useCommitteeTrustStore((s) => s.lookup);

  const refreshMarks = useMarksStore((s) => s.refresh);
  const refreshCourses = useCoursesStore((s) => s.refresh);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const handleScanned = useCallback(
    async (data: string) => {
      if (status.kind !== 'scanning') return;
      if (lastHandled.current === data) return;
      lastHandled.current = data;

      setStatus({ kind: 'processing', message: 'Reading QR…' });
      const envelope = decodeQr(data);
      if (!envelope.ok) {
        setStatus({ kind: 'error', message: describeQrDecodeError(envelope.error) });
        return;
      }

      if (envelope.envelope.kind === 'openracer-trust') {
        const t = envelope.envelope.trust;
        Alert.alert(
          `Trust ${t.committeeName}?`,
          `Identity id: ${t.committeeId}\n\nBundles signed by this public key — courses, races, or boat profiles — will be accepted from now on.`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                lastHandled.current = null;
                setStatus({ kind: 'scanning' });
              },
            },
            {
              text: 'Trust',
              style: 'default',
              onPress: async () => {
                await addTrust(t);
                setStatus({
                  kind: 'success',
                  message: `Trusted ${t.committeeName}. You can now accept their courses, races, and boat profiles.`,
                });
              },
            },
          ],
        );
        return;
      }

      // openracer-boat-profile (Phase 1.9 b — crew season setup)
      if (envelope.envelope.kind === 'openracer-boat-profile') {
        const result = decodeBoatProfile(JSON.stringify(envelope.envelope.bundle));
        if (!result.ok) {
          setStatus({
            kind: 'error',
            message: describeBoatProfileDecodeError(result.error),
          });
          return;
        }
        const profile = result.bundle;
        const senderTrust = await lookupTrust(profile.payload.senderId);
        if (!senderTrust) {
          setStatus({
            kind: 'error',
            message: `Unknown sender "${profile.payload.senderName}". Have them show their identity QR first so you can trust their key.`,
          });
          return;
        }
        if (senderTrust.publicKey !== profile.publicKey) {
          setStatus({
            kind: 'error',
            message: `Sender "${profile.payload.senderName}" is trusted but their key changed. Re-scan their identity QR if the rotation is legitimate.`,
          });
          return;
        }
        Alert.alert(
          `Join "${profile.payload.boatName}"?`,
          `Invited by ${profile.payload.senderName}\n${profile.payload.marks.length} marks\n${profile.payload.polarRaw ? 'Polar table included' : 'No polar table'}\n\nMarks already in your library will be reused, not duplicated.`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                lastHandled.current = null;
                setStatus({ kind: 'scanning' });
              },
            },
            {
              text: 'Join',
              style: 'default',
              onPress: async () => {
                setStatus({
                  kind: 'processing',
                  message: 'Joining boat…',
                });
                try {
                  const out = await ingestBoatProfile(profile);
                  await refreshMarks();
                  setStatus({
                    kind: 'success',
                    message: `Joined "${profile.payload.boatName}". ${out.marksCreated} new marks, ${out.marksReused} reused${out.polarUpdated ? ', polar table set' : ''}.`,
                  });
                } catch (err) {
                  setStatus({
                    kind: 'error',
                    message: err instanceof Error ? err.message : 'Join failed',
                  });
                }
              },
            },
          ],
        );
        return;
      }

      // openracer-race-bundle (Phase 1.9 — crew sync)
      if (envelope.envelope.kind === 'openracer-race-bundle') {
        const result = decodeRaceBundle(JSON.stringify(envelope.envelope.bundle));
        if (!result.ok) {
          setStatus({
            kind: 'error',
            message: describeRaceDecodeError(result.error),
          });
          return;
        }
        const raceBundle = result.bundle;
        const senderTrust = await lookupTrust(raceBundle.payload.senderId);
        if (!senderTrust) {
          setStatus({
            kind: 'error',
            message: `Unknown sender "${raceBundle.payload.senderName}". Have them show their identity QR first so you can trust their key.`,
          });
          return;
        }
        if (senderTrust.publicKey !== raceBundle.publicKey) {
          setStatus({
            kind: 'error',
            message: `Sender "${raceBundle.payload.senderName}" is trusted but their key changed. Re-scan their identity QR if the rotation is legitimate.`,
          });
          return;
        }
        const gunDisplay = new Date(raceBundle.payload.gunAt).toLocaleTimeString(
          'en-GB',
          { hour: '2-digit', minute: '2-digit', second: '2-digit' },
        );
        Alert.alert(
          `Join "${raceBundle.payload.raceName}"?`,
          `From ${raceBundle.payload.senderName}\nGun at ${gunDisplay}\n${raceBundle.payload.course.legs.length} legs · ${raceBundle.payload.course.marks.length} marks\n\nYour timer will arm with the same gun + course.`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                lastHandled.current = null;
                setStatus({ kind: 'scanning' });
              },
            },
            {
              text: 'Join',
              style: 'default',
              onPress: async () => {
                setStatus({ kind: 'processing', message: 'Joining race…' });
                try {
                  const out = await ingestRaceBundle(raceBundle);
                  await Promise.all([refreshMarks(), refreshCourses()]);
                  setStatus({
                    kind: 'success',
                    message: `Armed for "${out.course.name}". ${out.marksCreated} new marks, ${out.marksReused} reused.`,
                  });
                } catch (err) {
                  setStatus({
                    kind: 'error',
                    message: err instanceof Error ? err.message : 'Join failed',
                  });
                }
              },
            },
          ],
        );
        return;
      }

      // openracer-finish (Phase 1.15 — leaderboard share)
      if (envelope.envelope.kind === 'openracer-finish') {
        const result = decodeFinishRecord(JSON.stringify(envelope.envelope.bundle));
        if (!result.ok) {
          setStatus({
            kind: 'error',
            message: describeFinishDecodeError(result.error),
          });
          return;
        }
        const finish = result.bundle;
        const senderTrust = await lookupTrust(finish.payload.senderId);
        if (!senderTrust) {
          setStatus({
            kind: 'error',
            message: `Unknown sender "${finish.payload.senderName}". Have them show their identity QR first so you can trust their key.`,
          });
          return;
        }
        if (senderTrust.publicKey !== finish.publicKey) {
          setStatus({
            kind: 'error',
            message: `Sender "${finish.payload.senderName}" is trusted but their key changed.`,
          });
          return;
        }
        const elapsedMin = Math.floor(finish.payload.elapsedSeconds / 60);
        const elapsedSec = finish.payload.elapsedSeconds % 60;
        Alert.alert(
          `Add ${finish.payload.boatName} to leaderboard?`,
          `Race: ${finish.payload.raceName}\nElapsed: ${elapsedMin}:${elapsedSec.toString().padStart(2, '0')}\nFrom: ${finish.payload.senderName}`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                lastHandled.current = null;
                setStatus({ kind: 'scanning' });
              },
            },
            {
              text: 'Add',
              style: 'default',
              onPress: async () => {
                try {
                  await recordFinish(finish.payload);
                  setStatus({
                    kind: 'success',
                    message: `Added ${finish.payload.boatName} to "${finish.payload.raceName}" leaderboard.`,
                  });
                } catch (err) {
                  setStatus({
                    kind: 'error',
                    message: err instanceof Error ? err.message : 'Save failed',
                  });
                }
              },
            },
          ],
        );
        return;
      }

      // openracer-bundle
      const bundleResult = decodeBundle(JSON.stringify(envelope.envelope.bundle));
      if (!bundleResult.ok) {
        setStatus({
          kind: 'error',
          message: describeDecodeError(bundleResult.error),
        });
        return;
      }
      const bundle = bundleResult.bundle;
      const trust = await lookupTrust(bundle.payload.committeeId);
      if (!trust) {
        setStatus({
          kind: 'error',
          message: `Unknown committee "${bundle.payload.committeeName}". Scan their trust QR first.`,
        });
        return;
      }
      if (trust.publicKey !== bundle.publicKey) {
        setStatus({
          kind: 'error',
          message: `Committee "${bundle.payload.committeeName}" is trusted but their key changed. Re-scan their trust QR if you know the rotation is legitimate.`,
        });
        return;
      }

      setStatus({ kind: 'processing', message: 'Ingesting course…' });
      try {
        const result = await ingestCoursePushBundle(bundle);
        await Promise.all([refreshMarks(), refreshCourses()]);
        setStatus({
          kind: 'success',
          message: `Got "${result.course.name}" from ${bundle.payload.committeeName}. ${result.marksCreated} new marks, ${result.marksReused} reused.`,
        });
      } catch (err) {
        setStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Ingest failed',
        });
      }
    },
    [addTrust, lookupTrust, refreshCourses, refreshMarks, status.kind],
  );

  function handleContinue() {
    if (status.kind === 'success') {
      navigation.replace('CourseEntry');
      return;
    }
    lastHandled.current = null;
    setStatus({ kind: 'scanning' });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
      <View flex={1}>
        <View
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal={theme.space.md}
          paddingVertical={theme.space.sm}
          backgroundColor="#000"
        >
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Text color="#FFF" fontSize={theme.type.body.size} fontWeight="600">
              ← Back
            </Text>
          </Pressable>
          <Text color="#FFF" fontSize={theme.type.h3.size} fontWeight="600">
            Scan QR
          </Text>
          <View width={44} />
        </View>

        {permission?.granted ? (
          <View flex={1}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={(e) => {
                void handleScanned(e.data);
              }}
            />
            <StatusBanner status={status} theme={theme} onContinue={handleContinue} />
          </View>
        ) : (
          <View flex={1} alignItems="center" justifyContent="center" padding={theme.space.lg}>
            <Text color="#FFF" fontSize={theme.type.body.size} textAlign="center">
              Camera permission is required to scan committee QRs.
            </Text>
            {permission?.canAskAgain ? (
              <Pressable onPress={requestPermission} hitSlop={8}>
                <View
                  marginTop={theme.space.md}
                  paddingVertical={theme.space.sm}
                  paddingHorizontal={theme.space.lg}
                  borderRadius={theme.radius.full}
                  backgroundColor={theme.accent}
                >
                  <Text color={theme.bg} fontWeight="600">
                    Grant permission
                  </Text>
                </View>
              </Pressable>
            ) : (
              <Text color="#AAA" marginTop={theme.space.md} textAlign="center">
                Permission was denied. Enable camera access in Settings → OpenRacer.
              </Text>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function StatusBanner({
  status,
  theme,
  onContinue,
}: {
  status: Status;
  theme: ReturnType<typeof getTheme>;
  onContinue: () => void;
}) {
  if (status.kind === 'scanning') {
    return (
      <View
        padding={theme.space.md}
        backgroundColor="rgba(0,0,0,0.7)"
      >
        <Text color="#FFF" fontSize={theme.type.body.size} textAlign="center">
          Point the camera at a committee trust or course QR.
        </Text>
      </View>
    );
  }

  const colour =
    status.kind === 'success'
      ? theme.status.success
      : status.kind === 'error'
        ? theme.status.danger
        : theme.status.warning;

  return (
    <View padding={theme.space.md} backgroundColor={colour}>
      <Text color="#FFF" fontSize={theme.type.body.size} textAlign="center">
        {status.message}
      </Text>
      {status.kind !== 'processing' ? (
        <Pressable onPress={onContinue} hitSlop={8}>
          <View
            marginTop={theme.space.sm}
            paddingVertical={theme.space.sm}
            paddingHorizontal={theme.space.lg}
            borderRadius={theme.radius.full}
            backgroundColor="#FFF"
            alignSelf="center"
          >
            <Text color={colour} fontWeight="700">
              {status.kind === 'success' ? 'Open course' : 'Scan again'}
            </Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
