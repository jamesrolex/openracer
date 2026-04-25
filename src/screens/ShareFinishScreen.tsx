/**
 * ShareFinishScreen — generate a signed finish-record QR after a race.
 *
 * Reached from RaceSession via "Share finish". Fills in race name, gun
 * time, finish time from the session; boat name from settings; signs
 * with the device's signing identity. Crew or competitors scan with
 * their phones to add this boat to their leaderboard view of the race.
 *
 * Refuses to render if:
 * - No signing identity (need keypair to sign)
 * - No boat name (the QR's main piece of identity)
 * - No active session passed via route param
 */

import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';

import { buildFinishRecord } from '../domain/coursePush';
import { encodeFinishQr } from '../domain/qrEnvelope';
import type { RootStackScreenProps } from '../navigation';
import { getCourse } from '../stores/coursesRepo';
import { getRaceSession } from '../stores/raceSessionsRepo';
import { useCommitteeIdentityStore } from '../stores/useCommitteeIdentityStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import type { RaceSession } from '../types/race';

export function ShareFinishScreen({
  navigation,
  route,
}: RootStackScreenProps<'ShareFinish'>) {
  const themeVariant = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeVariant);

  const identity = useCommitteeIdentityStore((s) => s.identity);
  const boatName = useSettingsStore((s) => s.boatName);

  const [session, setSession] = useState<RaceSession | null>(null);
  const [raceName, setRaceName] = useState<string>('Race');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const s = await getRaceSession(route.params.sessionId);
      setSession(s);
      if (s?.courseId) {
        const c = await getCourse(s.courseId);
        if (c) setRaceName(c.name);
      } else if (s) {
        const d = new Date(s.startedAt);
        setRaceName(`Race ${d.toLocaleDateString('en-GB')}`);
      }
      setLoading(false);
    })();
  }, [route.params.sessionId]);

  const qr = useMemo(() => {
    if (!identity || !boatName || !session || !session.finishedAt) return null;
    try {
      const signed = buildFinishRecord({
        privateKey: identity.privateKey,
        senderId: identity.committeeId,
        senderName: identity.committeeName,
        raceName,
        boatName,
        gunAt: new Date(session.startedAt),
        finishedAt: new Date(session.finishedAt),
        courseId: session.courseId ?? undefined,
      });
      return { raw: encodeFinishQr(signed), bundle: signed };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Build failed' };
    }
  }, [identity, boatName, session, raceName]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.space.md,
          paddingTop: theme.space.sm,
          paddingBottom: theme.space.xl,
        }}
      >
        <View
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          marginBottom={theme.space.md}
        >
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Text
              color={theme.accent}
              fontSize={theme.type.body.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
            >
              ← Back
            </Text>
          </Pressable>
          <Text
            color={theme.text.primary}
            fontSize={theme.type.h2.size}
            fontWeight={theme.type.h2.weight as '600'}
          >
            Share finish
          </Text>
          <View width={44} />
        </View>

        {loading ? (
          <Text color={theme.text.muted}>Loading…</Text>
        ) : !identity ? (
          <EmptyMessage
            theme={theme}
            headline="Set up your signing identity first"
            subline="Settings → Me → My signing identity"
          />
        ) : !boatName ? (
          <EmptyMessage
            theme={theme}
            headline="Name your boat first"
            subline="Settings → My boat → Boat name"
          />
        ) : !session ? (
          <EmptyMessage theme={theme} headline="Session not found" subline="" />
        ) : !session.finishedAt ? (
          <EmptyMessage
            theme={theme}
            headline="Race not finished"
            subline="Tap Finish on the race timer first."
          />
        ) : qr && 'error' in qr ? (
          <EmptyMessage
            theme={theme}
            headline="Build failed"
            subline={qr.error ?? 'Unknown error'}
          />
        ) : qr ? (
          <View alignItems="center" paddingVertical={theme.space.lg}>
            <View
              padding={theme.space.md}
              backgroundColor="#FFFFFF"
              borderRadius={theme.radius.lg}
              marginBottom={theme.space.md}
            >
              <QRCode value={qr.raw} size={260} />
            </View>
            <Text
              color={theme.text.primary}
              fontSize={theme.type.h2.size}
              fontWeight="700"
            >
              {boatName}
            </Text>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.body.size}
              marginTop={theme.space.xs}
            >
              {raceName}
            </Text>
            <Text
              color={theme.text.primary}
              fontSize={theme.type.h1.size}
              fontWeight="700"
              marginTop={theme.space.md}
              style={{ fontFamily: 'Menlo' }}
            >
              {Math.floor(qr.bundle.payload.elapsedSeconds / 60)}:
              {(qr.bundle.payload.elapsedSeconds % 60).toString().padStart(2, '0')}
            </Text>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.caption.size}
              marginTop={theme.space.md}
              textAlign="center"
              paddingHorizontal={theme.space.lg}
            >
              Have your competitor scan this on their phone — their leaderboard
              picks up your finish.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyMessage({
  theme,
  headline,
  subline,
}: {
  theme: ReturnType<typeof getTheme>;
  headline: string;
  subline: string;
}) {
  return (
    <View paddingVertical={theme.space.xl} alignItems="center">
      <Text
        color={theme.text.primary}
        fontSize={theme.type.h2.size}
        fontWeight="700"
        textAlign="center"
        marginBottom={theme.space.sm}
      >
        {headline}
      </Text>
      <Text
        color={theme.text.muted}
        fontSize={theme.type.body.size}
        textAlign="center"
      >
        {subline}
      </Text>
    </View>
  );
}
