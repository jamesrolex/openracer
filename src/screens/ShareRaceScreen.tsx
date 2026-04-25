/**
 * ShareRaceScreen — generate a signed race-bundle QR for crew members.
 * Carries the active draft course + the armed gun time + the start
 * sequence + the wind direction/speed (when set) + rabbit launch (when
 * set). Crew members scan via the existing ScanCoursePushScreen and
 * their phones arm with the same race state.
 *
 * Refuses to render if:
 * - No committee identity (we re-use it for the sender keypair)
 * - Timer not armed (no gun time to share)
 * - No active draft course
 */

import { useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';

import { buildRaceBundle } from '../domain/coursePush';
import { encodeRaceBundleQr } from '../domain/qrEnvelope';
import type { RootStackScreenProps } from '../navigation';
import { useCommitteeIdentityStore } from '../stores/useCommitteeIdentityStore';
import { useCoursesStore } from '../stores/useCoursesStore';
import { useMarksStore } from '../stores/useMarksStore';
import { useRaceStore } from '../stores/useRaceStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';

export function ShareRaceScreen({ navigation }: RootStackScreenProps<'ShareRace'>) {
  const themeVariant = useSettingsStore((state) => state.theme);
  const theme = getTheme(themeVariant);

  const identity = useCommitteeIdentityStore((s) => s.identity);
  const draft = useCoursesStore((s) => s.activeDraft);
  const marks = useMarksStore((s) => s.marks);
  const sequenceStartTime = useRaceStore((s) => s.sequenceStartTime);
  const sequence = useRaceStore((s) => s.sequence);
  const rabbitLaunchAt = useRaceStore((s) => s.rabbitLaunchAt);
  const manualTrueWindDegrees = useSettingsStore((s) => s.manualTrueWindDegrees);
  const manualTrueWindKn = useSettingsStore((s) => s.manualTrueWindKn);

  const qr = useMemo(() => {
    if (!identity || !draft || !sequenceStartTime) return null;
    try {
      const signed = buildRaceBundle({
        course: draft,
        marks,
        senderId: identity.committeeId,
        senderName: identity.committeeName,
        privateKey: identity.privateKey,
        raceName: draft.name,
        gunAt: new Date(sequenceStartTime),
        startSequence: sequence,
        manualTrueWindDegrees: manualTrueWindDegrees ?? undefined,
        manualTrueWindKn: manualTrueWindKn ?? undefined,
        rabbitLaunchAt: rabbitLaunchAt ?? undefined,
      });
      return { raw: encodeRaceBundleQr(signed), bundle: signed };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Build failed' };
    }
  }, [
    identity,
    draft,
    marks,
    sequenceStartTime,
    sequence,
    rabbitLaunchAt,
    manualTrueWindDegrees,
    manualTrueWindKn,
  ]);

  const gunTimeDisplay = sequenceStartTime
    ? new Date(sequenceStartTime).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';

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
            Share with crew
          </Text>
          <View width={44} />
        </View>

        {!identity ? (
          <EmptyState
            theme={theme}
            title="Set up committee identity first"
            body="Crew need to verify your share against a known public key. Set up your identity once — same key works for sharing races and pushing committee courses."
            cta="Set up identity"
            onCta={() => navigation.replace('CommitteeIdentity')}
          />
        ) : !draft || !sequenceStartTime ? (
          <EmptyState
            theme={theme}
            title="Arm the timer first"
            body="Build a course and arm the timer; the gun time is part of what you're sharing."
            cta="Race timer"
            onCta={() => navigation.replace('RaceTimer')}
          />
        ) : qr && 'error' in qr ? (
          <EmptyState
            theme={theme}
            title="Couldn't build the bundle"
            body={qr.error ?? 'Unknown error'}
            cta="Back to timer"
            onCta={() => navigation.goBack()}
          />
        ) : qr && 'raw' in qr ? (
          <>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.caption.size}
              lineHeight={theme.type.caption.lineHeight}
              marginBottom={theme.space.md}
            >
              Have your crew open Settings → Committee push → Scan a committee QR
              and aim their phone at this code. Their timer arms with the same gun
              and course.
            </Text>

            <View alignItems="center" marginBottom={theme.space.md}>
              <View
                padding={theme.space.md}
                backgroundColor="#FFFFFF"
                borderRadius={theme.radius.lg}
              >
                <QRCode value={qr.raw} size={280} ecl="M" />
              </View>
            </View>

            <View
              padding={theme.space.md}
              borderRadius={theme.radius.md}
              borderColor={theme.border}
              borderWidth={1}
            >
              <Text
                color={theme.text.muted}
                fontSize={theme.type.micro.size}
                fontWeight={theme.type.micro.weight as '600'}
                letterSpacing={theme.type.micro.letterSpacing}
                marginBottom={theme.space.xs}
              >
                BUNDLE CONTAINS
              </Text>
              <BundleRow theme={theme} label="Course" value={draft.name} />
              <BundleRow theme={theme} label="Legs" value={`${draft.legs.length}`} />
              <BundleRow theme={theme} label="Marks referenced" value={`${marks.length}`} />
              <BundleRow theme={theme} label="Gun at" value={gunTimeDisplay} />
              <BundleRow
                theme={theme}
                label="Wind direction"
                value={
                  manualTrueWindDegrees === null
                    ? '— (not set)'
                    : `${Math.round(manualTrueWindDegrees)}° T`
                }
              />
              <BundleRow
                theme={theme}
                label="Wind speed"
                value={
                  manualTrueWindKn === null
                    ? '— (not set)'
                    : `${manualTrueWindKn} kn`
                }
              />
              {rabbitLaunchAt ? (
                <BundleRow
                  theme={theme}
                  label="Rabbit launched"
                  value={new Date(rabbitLaunchAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                />
              ) : null}
              <BundleRow theme={theme} label="Signed by" value={identity.committeeName} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState({
  theme,
  title,
  body,
  cta,
  onCta,
}: {
  theme: ReturnType<typeof getTheme>;
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <View
      padding={theme.space.lg}
      borderRadius={theme.radius.lg}
      borderColor={theme.border}
      borderWidth={1}
      alignItems="center"
    >
      <Text
        color={theme.text.primary}
        fontSize={theme.type.h2.size}
        fontWeight={theme.type.h2.weight as '600'}
        textAlign="center"
        marginBottom={theme.space.sm}
      >
        {title}
      </Text>
      <Text
        color={theme.text.muted}
        fontSize={theme.type.body.size}
        lineHeight={theme.type.body.lineHeight}
        textAlign="center"
        marginBottom={theme.space.md}
      >
        {body}
      </Text>
      <Pressable onPress={onCta} hitSlop={8}>
        <View
          paddingVertical={theme.space.sm}
          paddingHorizontal={theme.space.lg}
          borderRadius={theme.radius.full}
          backgroundColor={theme.accent}
        >
          <Text
            color={theme.bg}
            fontSize={theme.type.bodySemi.size}
            fontWeight={theme.type.bodySemi.weight as '700'}
          >
            {cta}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

function BundleRow({
  theme,
  label,
  value,
}: {
  theme: ReturnType<typeof getTheme>;
  label: string;
  value: string;
}) {
  return (
    <View flexDirection="row" justifyContent="space-between" paddingVertical={2}>
      <Text color={theme.text.muted} fontSize={theme.type.caption.size}>
        {label}
      </Text>
      <Text color={theme.text.primary} fontSize={theme.type.caption.size}>
        {value}
      </Text>
    </View>
  );
}
