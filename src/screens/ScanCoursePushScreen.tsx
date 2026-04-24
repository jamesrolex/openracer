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

import { decodeBundle, describeDecodeError } from '../domain/coursePush';
import { ingestCoursePushBundle } from '../domain/coursePushIngest';
import { decodeQr, describeQrDecodeError } from '../domain/qrEnvelope';
import type { RootStackScreenProps } from '../navigation';
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
  const nightMode = useSettingsStore((state) => state.nightMode);
  const theme = getTheme(nightMode ? 'night' : 'day');

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
          'Trust this committee?',
          `${t.committeeName} (${t.committeeId})\n\nCourses signed by this public key will be accepted from now on.`,
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
                  message: `Trusted ${t.committeeName}. You can now accept their courses.`,
                });
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
