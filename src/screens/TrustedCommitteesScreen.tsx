/**
 * TrustedCommitteesScreen — list of committees whose bundles this
 * device will accept. Lets the sailor revoke any entry (trust is
 * additive and freely removable; re-add by re-scanning).
 */

import { useEffect } from 'react';
import { Alert, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';

import type { RootStackScreenProps } from '../navigation';
import { useCommitteeTrustStore } from '../stores/useCommitteeTrustStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';

export function TrustedCommitteesScreen({
  navigation,
}: RootStackScreenProps<'TrustedCommittees'>) {
  const nightMode = useSettingsStore((state) => state.nightMode);
  const theme = getTheme(nightMode ? 'night' : 'day');

  const trusted = useCommitteeTrustStore((s) => s.trusted);
  const refresh = useCommitteeTrustStore((s) => s.refresh);
  const revoke = useCommitteeTrustStore((s) => s.revoke);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function confirmRevoke(committeeId: string, committeeName: string) {
    Alert.alert(
      'Revoke trust?',
      `Bundles from ${committeeName} will no longer be accepted until you re-scan their trust QR.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke', style: 'destructive', onPress: () => void revoke(committeeId) },
      ],
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <View paddingHorizontal={theme.space.md} paddingTop={theme.space.sm} flex={1}>
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
            Trusted
          </Text>
          <Pressable
            onPress={() => navigation.navigate('ScanCoursePush')}
            hitSlop={8}
          >
            <Text
              color={theme.accent}
              fontSize={theme.type.body.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
            >
              + Scan
            </Text>
          </Pressable>
        </View>

        {trusted.length === 0 ? (
          <View flex={1} alignItems="center" justifyContent="center" padding={theme.space.lg}>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.body.size}
              lineHeight={theme.type.body.lineHeight}
              textAlign="center"
            >
              No committees trusted yet. Tap <Text color={theme.accent}>+ Scan</Text> to add
              one by scanning their trust QR.
            </Text>
          </View>
        ) : (
          <FlatList
            data={trusted}
            keyExtractor={(t) => t.committeeId}
            contentContainerStyle={{ paddingBottom: theme.space.xl }}
            renderItem={({ item }) => (
              <View
                paddingVertical={theme.space.md}
                paddingHorizontal={theme.space.md}
                marginBottom={theme.space.sm}
                backgroundColor={theme.surface}
                borderColor={theme.border}
                borderWidth={1}
                borderRadius={theme.radius.lg}
              >
                <Text
                  color={theme.text.primary}
                  fontSize={theme.type.h3.size}
                  fontWeight={theme.type.h3.weight as '600'}
                >
                  {item.committeeName}
                </Text>
                <Text
                  color={theme.text.muted}
                  fontSize={theme.type.caption.size}
                  marginTop={2}
                >
                  id {item.committeeId} · added {item.addedAt.split('T')[0]}
                </Text>
                <Text
                  color={theme.text.muted}
                  fontSize={theme.type.caption.size}
                  style={{ fontFamily: 'Menlo' }}
                  marginTop={2}
                >
                  key {item.publicKey.slice(0, 10)}…{item.publicKey.slice(-10)}
                </Text>
                <Pressable
                  onPress={() => confirmRevoke(item.committeeId, item.committeeName)}
                  hitSlop={8}
                >
                  <Text
                    color={theme.status.danger}
                    fontSize={theme.type.caption.size}
                    fontWeight={theme.type.bodySemi.weight as '600'}
                    marginTop={theme.space.sm}
                  >
                    Revoke
                  </Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
