/**
 * SettingsScreen — user preferences that persist via useSettingsStore.
 *
 * Phase 1 scope:
 *  - Unit overrides (speed, distance, coordinate format)
 *  - Night mode toggle
 *  - Entry points into Committee Identity + Trusted Committees
 *  - Diagnostic info (app version, data-reset for dev)
 *
 * Bigger settings (auto-night-mode, language, account) come later per
 * docs/phase-1-plan.md out-of-scope list.
 */

import Constants from 'expo-constants';
import { Alert, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';

import type { RootStackScreenProps } from '../navigation';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import type { LatLonFormat, DistanceUnit } from '../utils/format';
import type { SpeedUnit } from '../stores/useSettingsStore';

const SPEED_UNITS: { key: SpeedUnit; label: string }[] = [
  { key: 'kn', label: 'Knots' },
  { key: 'kmh', label: 'km/h' },
  { key: 'mph', label: 'mph' },
];

const DISTANCE_UNITS: { key: DistanceUnit; label: string }[] = [
  { key: 'nm', label: 'Nautical miles' },
  { key: 'km', label: 'Kilometres' },
  { key: 'm', label: 'Metres' },
];

const COORD_FORMATS: { key: LatLonFormat; label: string; example: string }[] = [
  { key: 'dmm', label: 'DMM', example: '52° 49.230\' N' },
  { key: 'dms', label: 'DMS', example: '52° 49\' 13.8" N' },
  { key: 'decimal', label: 'Decimal', example: '52.8205° N' },
];

export function SettingsScreen({ navigation }: RootStackScreenProps<'Settings'>) {
  const nightMode = useSettingsStore((s) => s.nightMode);
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const coordFormat = useSettingsStore((s) => s.coordFormat);
  const setNightMode = useSettingsStore((s) => s.setNightMode);
  const setSpeedUnit = useSettingsStore((s) => s.setSpeedUnit);
  const setDistanceUnit = useSettingsStore((s) => s.setDistanceUnit);
  const setCoordFormat = useSettingsStore((s) => s.setCoordFormat);

  const theme = getTheme(nightMode ? 'night' : 'day');
  const version = (Constants.expoConfig?.version as string | undefined) ?? 'dev';

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
            Settings
          </Text>
          <View width={44} />
        </View>

        <Section theme={theme} title="Display">
          <ToggleRow
            theme={theme}
            label="Night mode"
            description="Dark background, red night-vision accent."
            value={nightMode}
            onChange={setNightMode}
          />
        </Section>

        <Section theme={theme} title="Units">
          <RadioRow
            theme={theme}
            label="Speed"
            options={SPEED_UNITS}
            active={speedUnit}
            onChange={(v) => setSpeedUnit(v)}
          />
          <RadioRow
            theme={theme}
            label="Distance"
            options={DISTANCE_UNITS}
            active={distanceUnit}
            onChange={(v) => setDistanceUnit(v)}
          />
          <RadioRow
            theme={theme}
            label="Coordinates"
            options={COORD_FORMATS.map((c) => ({
              key: c.key,
              label: `${c.label} — ${c.example}`,
            }))}
            active={coordFormat}
            onChange={(v) => setCoordFormat(v)}
          />
        </Section>

        <Section theme={theme} title="Committee push">
          <LinkRow
            theme={theme}
            label="My committee identity"
            description="Keypair + QR for sailors to trust you."
            onPress={() => navigation.navigate('CommitteeIdentity')}
          />
          <LinkRow
            theme={theme}
            label="Trusted committees"
            description="Whose course broadcasts you'll accept."
            onPress={() => navigation.navigate('TrustedCommittees')}
          />
          <LinkRow
            theme={theme}
            label="Scan a committee QR"
            description="Add a trust key or accept a course."
            onPress={() => navigation.navigate('ScanCoursePush')}
          />
        </Section>

        <Section theme={theme} title="About">
          <InfoRow theme={theme} label="App version" value={version} />
          <InfoRow theme={theme} label="Locale" value="en-GB" />
          <InfoRow theme={theme} label="Phase" value="1 — course entry hero" />
          <Pressable
            onPress={() => {
              Alert.alert(
                'OpenRacer',
                'Open-source racing and navigation for sailors. MIT licensed software.',
              );
            }}
            hitSlop={8}
          >
            <Text
              color={theme.accent}
              fontSize={theme.type.body.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
              marginTop={theme.space.sm}
            >
              About OpenRacer →
            </Text>
          </Pressable>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: ReturnType<typeof getTheme>;
}) {
  return (
    <View marginBottom={theme.space.lg}>
      <Text
        color={theme.text.muted}
        fontSize={theme.type.label.size}
        fontWeight={theme.type.label.weight as '600'}
        letterSpacing={theme.type.label.letterSpacing}
        marginBottom={theme.space.sm}
      >
        {title.toUpperCase()}
      </Text>
      <View
        borderRadius={theme.radius.lg}
        borderColor={theme.border}
        borderWidth={1}
        paddingHorizontal={theme.space.md}
        paddingVertical={theme.space.sm}
      >
        {children}
      </View>
    </View>
  );
}

function ToggleRow({
  theme,
  label,
  description,
  value,
  onChange,
}: {
  theme: ReturnType<typeof getTheme>;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable onPress={() => onChange(!value)} hitSlop={4}>
      <View
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingVertical={theme.space.sm}
      >
        <View flex={1} paddingRight={theme.space.sm}>
          <Text
            color={theme.text.primary}
            fontSize={theme.type.body.size}
            fontWeight={theme.type.bodySemi.weight as '600'}
          >
            {label}
          </Text>
          <Text
            color={theme.text.muted}
            fontSize={theme.type.caption.size}
            lineHeight={theme.type.caption.lineHeight}
            marginTop={2}
          >
            {description}
          </Text>
        </View>
        <View
          width={48}
          height={28}
          borderRadius={theme.radius.full}
          backgroundColor={value ? theme.accent : theme.border}
          padding={2}
          alignItems={value ? 'flex-end' : 'flex-start'}
          justifyContent="center"
        >
          <View
            width={24}
            height={24}
            borderRadius={theme.radius.full}
            backgroundColor={theme.bg}
          />
        </View>
      </View>
    </Pressable>
  );
}

function RadioRow<T extends string>({
  theme,
  label,
  options,
  active,
  onChange,
}: {
  theme: ReturnType<typeof getTheme>;
  label: string;
  options: { key: T; label: string }[];
  active: T;
  onChange: (v: T) => void;
}) {
  return (
    <View paddingVertical={theme.space.sm}>
      <Text
        color={theme.text.primary}
        fontSize={theme.type.body.size}
        fontWeight={theme.type.bodySemi.weight as '600'}
        marginBottom={theme.space.xs}
      >
        {label}
      </Text>
      <View flexDirection="row" flexWrap="wrap">
        {options.map((opt) => {
          const on = opt.key === active;
          return (
            <Pressable key={opt.key} onPress={() => onChange(opt.key)} hitSlop={4}>
              <View
                paddingVertical={theme.space.xs}
                paddingHorizontal={theme.space.sm}
                borderRadius={theme.radius.full}
                backgroundColor={on ? theme.accent : 'transparent'}
                borderColor={on ? theme.accent : theme.border}
                borderWidth={1}
                marginRight={theme.space.xs}
                marginBottom={theme.space.xs}
              >
                <Text
                  color={on ? theme.bg : theme.text.secondary}
                  fontSize={theme.type.caption.size}
                  fontWeight={theme.type.bodySemi.weight as '600'}
                >
                  {opt.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function LinkRow({
  theme,
  label,
  description,
  onPress,
}: {
  theme: ReturnType<typeof getTheme>;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={4}>
      <View
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingVertical={theme.space.sm}
      >
        <View flex={1}>
          <Text
            color={theme.text.primary}
            fontSize={theme.type.body.size}
            fontWeight={theme.type.bodySemi.weight as '600'}
          >
            {label}
          </Text>
          <Text
            color={theme.text.muted}
            fontSize={theme.type.caption.size}
            marginTop={2}
          >
            {description}
          </Text>
        </View>
        <Text color={theme.accent} fontSize={theme.type.body.size}>
          ›
        </Text>
      </View>
    </Pressable>
  );
}

function InfoRow({
  theme,
  label,
  value,
}: {
  theme: ReturnType<typeof getTheme>;
  label: string;
  value: string;
}) {
  return (
    <View
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      paddingVertical={theme.space.xs}
    >
      <Text color={theme.text.muted} fontSize={theme.type.caption.size}>
        {label}
      </Text>
      <Text
        color={theme.text.primary}
        fontSize={theme.type.caption.size}
        style={{ fontFamily: 'Menlo' }}
      >
        {value}
      </Text>
    </View>
  );
}
