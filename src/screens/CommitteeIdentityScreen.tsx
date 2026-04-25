/**
 * CommitteeIdentityScreen — for a sailor who's running the committee
 * role. First launch: enter committee name, app generates a keypair
 * and shows a "trust me" QR for sailors to scan.
 *
 * The private key never leaves the device. The trust QR exposes only
 * the public key + committee metadata.
 */

import { useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Text, View } from 'tamagui';

import { encodeTrustQr } from '../domain/qrEnvelope';
import type { RootStackScreenProps } from '../navigation';
import { useCommitteeIdentityStore } from '../stores/useCommitteeIdentityStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';

export function CommitteeIdentityScreen({
  navigation,
}: RootStackScreenProps<'CommitteeIdentity'>) {
  const themeVariant = useSettingsStore((state) => state.theme);
  const theme = getTheme(themeVariant);

  const identity = useCommitteeIdentityStore((s) => s.identity);
  const createIdentity = useCommitteeIdentityStore((s) => s.create);
  const renameIdentity = useCommitteeIdentityStore((s) => s.rename);
  const regenerateKey = useCommitteeIdentityStore((s) => s.regenerateKey);
  const clear = useCommitteeIdentityStore((s) => s.clear);

  const [nameDraft, setNameDraft] = useState(identity?.committeeName ?? '');
  const [idDraft, setIdDraft] = useState(identity?.committeeId ?? '');

  function handleCreate() {
    const id = idDraft.trim() || nameDraft.trim();
    if (!nameDraft.trim() || !id) {
      Alert.alert('Missing details', 'Give the committee a name and a short id (e.g. “abersoch-sc”).');
      return;
    }
    createIdentity(id, nameDraft);
  }

  function handleRename() {
    renameIdentity(nameDraft);
  }

  function handleRegenerate() {
    Alert.alert(
      'Generate new key?',
      'Any sailor who trusts this committee will need to re-scan the new trust QR — old bundles stop verifying.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Regenerate', style: 'destructive', onPress: () => void regenerateKey() },
      ],
    );
  }

  function handleClear() {
    Alert.alert('Delete committee identity?', 'Your keypair will be wiped.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          clear();
          setNameDraft('');
          setIdDraft('');
        },
      },
    ]);
  }

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
            Committee
          </Text>
          <View width={44} />
        </View>

        {identity ? (
          <>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.caption.size}
              lineHeight={theme.type.caption.lineHeight}
              marginBottom={theme.space.md}
            >
              Show this QR to sailors so they can add you to their trust
              list. Private key stays on this phone.
            </Text>

            <View alignItems="center" marginBottom={theme.space.lg}>
              <View padding={theme.space.md} backgroundColor="#FFFFFF" borderRadius={theme.radius.lg}>
                <QRCode
                  value={encodeTrustQr({
                    committeeId: identity.committeeId,
                    committeeName: identity.committeeName,
                    publicKey: identity.publicKey,
                  })}
                  size={240}
                  ecl="M"
                />
              </View>
            </View>

            <Label theme={theme}>Committee name</Label>
            <Input
              value={nameDraft}
              onChangeText={setNameDraft}
              onBlur={handleRename}
              height={44}
              paddingHorizontal={theme.space.md}
              fontSize={theme.type.body.size}
              borderColor={theme.border}
              backgroundColor={theme.surface}
              color={theme.text.primary}
              placeholderTextColor={theme.text.muted}
              marginBottom={theme.space.md}
            />

            <Label theme={theme}>Committee id</Label>
            <View
              paddingVertical={theme.space.sm}
              paddingHorizontal={theme.space.md}
              backgroundColor={theme.surface}
              borderColor={theme.border}
              borderWidth={1}
              borderRadius={theme.radius.md}
              marginBottom={theme.space.md}
            >
              <Text color={theme.text.primary} fontSize={theme.type.body.size}>
                {identity.committeeId}
              </Text>
            </View>

            <Label theme={theme}>Public key fingerprint</Label>
            <View
              paddingVertical={theme.space.sm}
              paddingHorizontal={theme.space.md}
              backgroundColor={theme.surface}
              borderColor={theme.border}
              borderWidth={1}
              borderRadius={theme.radius.md}
              marginBottom={theme.space.lg}
            >
              <Text
                color={theme.text.secondary}
                fontSize={theme.type.caption.size}
                style={{ fontFamily: 'Menlo' }}
              >
                {identity.publicKey.slice(0, 12)}…{identity.publicKey.slice(-12)}
              </Text>
            </View>

            <Pressable onPress={handleRegenerate} hitSlop={8}>
              <View
                paddingVertical={theme.space.sm}
                paddingHorizontal={theme.space.md}
                borderRadius={theme.radius.md}
                borderColor={theme.border}
                borderWidth={1}
                alignItems="center"
                marginBottom={theme.space.sm}
              >
                <Text
                  color={theme.text.primary}
                  fontSize={theme.type.body.size}
                  fontWeight={theme.type.bodySemi.weight as '600'}
                >
                  Generate new key
                </Text>
              </View>
            </Pressable>
            <Pressable onPress={handleClear} hitSlop={8}>
              <View
                paddingVertical={theme.space.sm}
                paddingHorizontal={theme.space.md}
                alignItems="center"
              >
                <Text
                  color={theme.status.danger}
                  fontSize={theme.type.body.size}
                  fontWeight={theme.type.bodySemi.weight as '600'}
                >
                  Delete committee identity
                </Text>
              </View>
            </Pressable>
          </>
        ) : (
          <>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.body.size}
              lineHeight={theme.type.body.lineHeight}
              marginBottom={theme.space.md}
            >
              Set up your committee identity. We’ll generate a keypair;
              the private key stays on this phone, and sailors get a QR
              with the public half so they can accept your course
              broadcasts.
            </Text>

            <Label theme={theme}>Committee name</Label>
            <Input
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Abersoch Sailing Club"
              height={44}
              paddingHorizontal={theme.space.md}
              fontSize={theme.type.body.size}
              borderColor={theme.border}
              backgroundColor={theme.surface}
              color={theme.text.primary}
              placeholderTextColor={theme.text.muted}
              marginBottom={theme.space.md}
            />

            <Label theme={theme}>Committee id</Label>
            <Input
              value={idDraft}
              onChangeText={setIdDraft}
              placeholder="abersoch-sc"
              autoCapitalize="none"
              autoCorrect={false}
              height={44}
              paddingHorizontal={theme.space.md}
              fontSize={theme.type.body.size}
              borderColor={theme.border}
              backgroundColor={theme.surface}
              color={theme.text.primary}
              placeholderTextColor={theme.text.muted}
              marginBottom={theme.space.md}
            />

            <Pressable onPress={handleCreate} hitSlop={8}>
              <View
                paddingVertical={theme.space.md}
                paddingHorizontal={theme.space.md}
                borderRadius={theme.radius.lg}
                backgroundColor={theme.accent}
                alignItems="center"
              >
                <Text
                  color={theme.bg}
                  fontSize={theme.type.body.size}
                  fontWeight={theme.type.bodySemi.weight as '700'}
                >
                  Create identity
                </Text>
              </View>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Label({
  children,
  theme,
}: {
  children: string;
  theme: ReturnType<typeof getTheme>;
}) {
  return (
    <Text
      color={theme.text.muted}
      fontSize={theme.type.label.size}
      fontWeight={theme.type.label.weight as '600'}
      letterSpacing={theme.type.label.letterSpacing}
      marginBottom={theme.space.xs}
    >
      {children.toUpperCase()}
    </Text>
  );
}
