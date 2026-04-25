/**
 * ShareCourseScreen — take the active draft course, sign it against the
 * committee identity, show a QR for sailors to scan.
 *
 * Refuses to render if:
 * - no committee identity is set (send user to CommitteeIdentityScreen)
 * - no active draft course
 * - course legs reference marks the library doesn't have (shouldn't happen
 *   since the marks came from the library; defensive)
 */

import { useMemo } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';

import { buildBundle } from '../domain/coursePush';
import { encodeBundleQr } from '../domain/qrEnvelope';
import type { RootStackScreenProps } from '../navigation';
import { useCommitteeIdentityStore } from '../stores/useCommitteeIdentityStore';
import { useCoursesStore } from '../stores/useCoursesStore';
import { useMarksStore } from '../stores/useMarksStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';

export function ShareCourseScreen({ navigation }: RootStackScreenProps<'ShareCourse'>) {
  const themeVariant = useSettingsStore((state) => state.theme);
  const theme = getTheme(themeVariant);

  const identity = useCommitteeIdentityStore((s) => s.identity);
  const draft = useCoursesStore((s) => s.activeDraft);
  const marks = useMarksStore((s) => s.marks);

  const qr = useMemo(() => {
    if (!identity || !draft) return null;
    try {
      const bundle = buildBundle({
        course: draft,
        marks,
        committeeId: identity.committeeId,
        committeeName: identity.committeeName,
        privateKey: identity.privateKey,
      });
      return { raw: encodeBundleQr(bundle), bundle };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Build failed' };
    }
  }, [identity, draft, marks]);

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
            Share course
          </Text>
          <View width={44} />
        </View>

        {!identity ? (
          <EmptyState
            theme={theme}
            title="Signing identity required"
            body="Sailors need to verify your broadcast against a known public key. Create your identity so the QR can be signed."
            cta="Set up identity"
            onCta={() => navigation.replace('CommitteeIdentity')}
          />
        ) : !draft ? (
          <EmptyState
            theme={theme}
            title="No course to share"
            body="Build a course first, then come back here to broadcast it."
            cta="Build course"
            onCta={() => navigation.replace('CourseEntry')}
          />
        ) : qr && 'error' in qr ? (
          <EmptyState
            theme={theme}
            title="Couldn't build the bundle"
            body={qr.error ?? 'Unknown error'}
            cta="Back to course"
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
              Show this QR to sailors. Their app verifies the signature
              against {identity.committeeName} before accepting.
            </Text>

            <View alignItems="center" marginBottom={theme.space.md}>
              <View padding={theme.space.md} backgroundColor="#FFFFFF" borderRadius={theme.radius.lg}>
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
                BUNDLE SUMMARY
              </Text>
              <Row theme={theme} label="Course" value={qr.bundle.payload.courseName} />
              <Row theme={theme} label="Committee" value={qr.bundle.payload.committeeName} />
              <Row
                theme={theme}
                label="Marks"
                value={String(qr.bundle.payload.marks.length)}
              />
              <Row theme={theme} label="Legs" value={String(qr.bundle.payload.legs.length)} />
              <Row
                theme={theme}
                label="Signature"
                value={`${qr.bundle.signature.slice(0, 10)}…`}
              />
              <Row
                theme={theme}
                label="QR size"
                value={`${qr.raw.length} chars`}
              />
            </View>

            {qr.raw.length > 2500 ? (
              <Pressable onPress={() => Alert.alert('QR almost at limit', 'Consider splitting the course or paring marks; dense QRs may be hard to scan on older phones.')}>
                <Text
                  color={theme.status.warning}
                  fontSize={theme.type.caption.size}
                  marginTop={theme.space.sm}
                >
                  ⚠ Bundle is large — tap for details.
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof getTheme>;
}) {
  return (
    <View flexDirection="row" justifyContent="space-between" paddingVertical={2}>
      <Text color={theme.text.muted} fontSize={theme.type.caption.size}>
        {label}
      </Text>
      <Text
        color={theme.text.primary}
        fontSize={theme.type.caption.size}
        style={{ fontFamily: 'Menlo' }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
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
    <View paddingVertical={theme.space.xl} alignItems="center">
      <Text
        color={theme.text.primary}
        fontSize={theme.type.h3.size}
        fontWeight={theme.type.h3.weight as '600'}
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
        paddingHorizontal={theme.space.lg}
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
            fontSize={theme.type.body.size}
            fontWeight={theme.type.bodySemi.weight as '600'}
          >
            {cta}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
