/**
 * ShareBoatProfileScreen — bundle the saved marks library + polar
 * table into a signed QR that crew scan once at the start of a season.
 * After scanning, their phone has the same marks + polar (and they
 * can race with the same setup).
 *
 * Excludes per-device / per-race state (theme, wind direction/speed,
 * trip odometer, race history). The boat profile is "what every crew
 * member sees about THIS boat."
 */

import { useMemo, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Text, View } from 'tamagui';

import { buildBoatProfile } from '../domain/coursePush';
import type { RootStackScreenProps } from '../navigation';
import { useCommitteeIdentityStore } from '../stores/useCommitteeIdentityStore';
import { useMarksStore } from '../stores/useMarksStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import type { QrEnvelope } from '../types/coursePush';
import { QR_ENVELOPE_VERSION } from '../types/coursePush';

function encodeBoatProfileQr(bundle: ReturnType<typeof buildBoatProfile>): string {
  const env: QrEnvelope = {
    kind: 'openracer-boat-profile',
    version: QR_ENVELOPE_VERSION,
    bundle,
  };
  return JSON.stringify(env);
}

export function ShareBoatProfileScreen({
  navigation,
}: RootStackScreenProps<'ShareBoatProfile'>) {
  const themeVariant = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeVariant);

  const identity = useCommitteeIdentityStore((s) => s.identity);
  const marks = useMarksStore((s) => s.marks);
  const polarRaw = useSettingsStore((s) => s.polarRaw);

  const [boatName, setBoatName] = useState(
    identity?.committeeName ?? 'My boat',
  );

  const qr = useMemo(() => {
    if (!identity || marks.length === 0) return null;
    try {
      const bundle = buildBoatProfile({
        senderId: identity.committeeId,
        senderName: identity.committeeName,
        privateKey: identity.privateKey,
        boatName: boatName.trim() || 'My boat',
        marks,
        polarRaw: polarRaw ?? undefined,
      });
      return { raw: encodeBoatProfileQr(bundle), bundle };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Build failed' };
    }
  }, [identity, marks, polarRaw, boatName]);

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
            Invite crew
          </Text>
          <View width={44} />
        </View>

        <Text
          color={theme.text.muted}
          fontSize={theme.type.caption.size}
          lineHeight={theme.type.caption.lineHeight}
          marginBottom={theme.space.md}
        >
          Show this QR to your crew once at the start of a season. They tap
          Settings → Scan QR → aim at this code → &ldquo;Join boat?&rdquo; — and
          their phone gets your saved marks + polar. Per-device preferences
          (theme, wind for today, trip odometer, race history) stay personal
          to each phone.
        </Text>

        <Text
          color={theme.text.muted}
          fontSize={theme.type.label.size}
          fontWeight={theme.type.label.weight as '600'}
          letterSpacing={theme.type.label.letterSpacing}
          marginBottom={theme.space.xs}
        >
          BOAT NAME
        </Text>
        <Input
          value={boatName}
          onChangeText={setBoatName}
          placeholder="My boat"
          height={44}
          paddingHorizontal={theme.space.md}
          fontSize={theme.type.body.size}
          borderColor={theme.border}
          backgroundColor={theme.surface}
          color={theme.text.primary}
          placeholderTextColor={theme.text.muted}
          marginBottom={theme.space.md}
        />

        {!identity ? (
          <EmptyState
            theme={theme}
            title="Committee identity required"
            body="Crew need to verify the bundle against your public key. Set up your identity once — same key works for sharing everything."
            cta="Set up identity"
            onCta={() => navigation.replace('CommitteeIdentity')}
          />
        ) : marks.length === 0 ? (
          <EmptyState
            theme={theme}
            title="No marks to share"
            body="Add at least one mark to your library before sharing the boat profile."
            cta="Mark library"
            onCta={() => navigation.replace('MarkLibrary')}
          />
        ) : qr && 'error' in qr ? (
          <EmptyState
            theme={theme}
            title="Couldn't build the bundle"
            body={qr.error ?? 'Unknown error'}
            cta="Back"
            onCta={() => navigation.goBack()}
          />
        ) : qr && 'raw' in qr ? (
          <>
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
              <Row theme={theme} label="Marks" value={`${marks.length}`} />
              <Row
                theme={theme}
                label="Polar table"
                value={polarRaw ? 'included' : 'not set'}
              />
              <Row theme={theme} label="Boat name" value={boatName.trim() || 'My boat'} />
              <Row theme={theme} label="Signed by" value={identity.committeeName} />
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

function Row({
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
