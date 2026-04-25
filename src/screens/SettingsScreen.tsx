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
import { Input, Text, View } from 'tamagui';

import { BUILTIN_POLARS } from '../domain/polars';
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
  const themeVariant = useSettingsStore((s) => s.theme);
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const coordFormat = useSettingsStore((s) => s.coordFormat);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setSpeedUnit = useSettingsStore((s) => s.setSpeedUnit);
  const setDistanceUnit = useSettingsStore((s) => s.setDistanceUnit);
  const setCoordFormat = useSettingsStore((s) => s.setCoordFormat);
  const manualTrueWindDegrees = useSettingsStore((s) => s.manualTrueWindDegrees);
  const setManualTrueWindDegrees = useSettingsStore(
    (s) => s.setManualTrueWindDegrees,
  );
  const manualTrueWindKn = useSettingsStore((s) => s.manualTrueWindKn);
  const setManualTrueWindKn = useSettingsStore((s) => s.setManualTrueWindKn);
  const polarRaw = useSettingsStore((s) => s.polarRaw);
  const setPolarRaw = useSettingsStore((s) => s.setPolarRaw);

  const theme = getTheme(themeVariant);
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
          <RadioRow
            theme={theme}
            label="Theme"
            options={[
              { key: 'day', label: 'Day' },
              { key: 'night', label: 'Night' },
              { key: 'kindle', label: 'Kindle' },
            ]}
            active={themeVariant}
            onChange={(v) => setTheme(v)}
          />
          <Text
            color={theme.text.muted}
            fontSize={theme.type.caption.size}
            lineHeight={theme.type.caption.lineHeight}
            marginTop={theme.space.xs}
          >
            {themeVariant === 'day'
              ? 'Standard daylight UI.'
              : themeVariant === 'night'
                ? 'Dark background, dim red accent for cockpit night-vision.'
                : 'High-contrast black and white for sunlight readability — also the look that ports to e-ink boat displays in the future.'}
          </Text>
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

        <Section theme={theme} title="Racing">
          <LinkRow
            theme={theme}
            label="My sailing log"
            description="Lifetime miles, boats joined, recent races."
            onPress={() => navigation.navigate('SailorLog')}
          />
          <LinkRow
            theme={theme}
            label="Saved courses"
            description="Re-arm last week's course in seconds."
            onPress={() => navigation.navigate('CourseLibrary')}
          />
          <LinkRow
            theme={theme}
            label="Race history"
            description="Past race sessions with duration + distance + points."
            onPress={() => navigation.navigate('RaceSessions')}
          />
          <WindDirectionRow
            theme={theme}
            value={manualTrueWindDegrees}
            onChange={setManualTrueWindDegrees}
          />
          <WindSpeedRow
            theme={theme}
            value={manualTrueWindKn}
            onChange={setManualTrueWindKn}
          />
          <PolarRow
            theme={theme}
            value={polarRaw}
            onChange={setPolarRaw}
          />
        </Section>

        <Section theme={theme} title="Crew + committee">
          <LinkRow
            theme={theme}
            label="My signing identity"
            description="Keypair + QR for sailors and crew to trust you. One key signs every share."
            onPress={() => navigation.navigate('CommitteeIdentity')}
          />
          <LinkRow
            theme={theme}
            label="Invite crew (Join boat)"
            description="QR your crew scan once at season start — gives them your marks + polar."
            onPress={() => navigation.navigate('ShareBoatProfile')}
          />
          <LinkRow
            theme={theme}
            label="Trusted committees + crew"
            description="Whose bundles you'll accept (committees + crew leaders)."
            onPress={() => navigation.navigate('TrustedCommittees')}
          />
          <LinkRow
            theme={theme}
            label="Scan QR"
            description="Trust key, accept a course, or join a race / boat profile from crew."
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

function WindDirectionRow({
  theme,
  value,
  onChange,
}: {
  theme: ReturnType<typeof getTheme>;
  value: number | null;
  onChange: (deg: number | null) => void;
}) {
  function commit(text: string) {
    const trimmed = text.trim();
    if (trimmed === '') {
      onChange(null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return;
    // Clamp 0-360.
    const wrapped = ((parsed % 360) + 360) % 360;
    onChange(wrapped);
  }

  return (
    <View paddingVertical={theme.space.xs}>
      <Text
        color={theme.text.primary}
        fontSize={theme.type.body.size}
        fontWeight={theme.type.bodySemi.weight as '600'}
      >
        True wind direction (°T)
      </Text>
      <Text
        color={theme.text.muted}
        fontSize={theme.type.caption.size}
        lineHeight={theme.type.caption.lineHeight}
        marginTop={2}
        marginBottom={theme.space.xs}
      >
        Powers the favoured-end chip on the start-line readout. Update before each start.
        Leave blank to hide the chip.
      </Text>
      <Input
        value={value === null ? '' : String(Math.round(value))}
        onChangeText={(t) => commit(t)}
        placeholder="e.g. 230"
        keyboardType="numeric"
        height={44}
        paddingHorizontal={theme.space.md}
        fontSize={theme.type.body.size}
        borderColor={theme.border}
        backgroundColor={theme.surface}
        color={theme.text.primary}
        placeholderTextColor={theme.text.muted}
      />
    </View>
  );
}

function WindSpeedRow({
  theme,
  value,
  onChange,
}: {
  theme: ReturnType<typeof getTheme>;
  value: number | null;
  onChange: (kn: number | null) => void;
}) {
  function commit(text: string) {
    const trimmed = text.trim();
    if (trimmed === '') {
      onChange(null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 80) return;
    onChange(parsed);
  }
  return (
    <View paddingVertical={theme.space.xs}>
      <Text
        color={theme.text.primary}
        fontSize={theme.type.body.size}
        fontWeight={theme.type.bodySemi.weight as '600'}
      >
        True wind speed (kn)
      </Text>
      <Text
        color={theme.text.muted}
        fontSize={theme.type.caption.size}
        lineHeight={theme.type.caption.lineHeight}
        marginTop={2}
        marginBottom={theme.space.xs}
      >
        Drives the polar target-boatspeed lookup. Leave blank to hide the readout.
      </Text>
      <Input
        value={value === null ? '' : String(value)}
        onChangeText={(t) => commit(t)}
        placeholder="e.g. 12"
        keyboardType="numeric"
        height={44}
        paddingHorizontal={theme.space.md}
        fontSize={theme.type.body.size}
        borderColor={theme.border}
        backgroundColor={theme.surface}
        color={theme.text.primary}
        placeholderTextColor={theme.text.muted}
      />
    </View>
  );
}

function PolarRow({
  theme,
  value,
  onChange,
}: {
  theme: ReturnType<typeof getTheme>;
  value: string | null;
  onChange: (raw: string | null) => void;
}) {
  return (
    <View paddingVertical={theme.space.xs}>
      <Text
        color={theme.text.primary}
        fontSize={theme.type.body.size}
        fontWeight={theme.type.bodySemi.weight as '600'}
      >
        Polar table
      </Text>
      <Text
        color={theme.text.muted}
        fontSize={theme.type.caption.size}
        lineHeight={theme.type.caption.lineHeight}
        marginTop={2}
        marginBottom={theme.space.xs}
      >
        Paste an ORC-style polar table (header row of TWS bins, then rows of TWA + speeds).
        Drives the target-boatspeed strip on the race timer.
      </Text>
      <View flexDirection="row" marginBottom={theme.space.xs} flexWrap="wrap">
        {BUILTIN_POLARS.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => onChange(p.raw)}
            hitSlop={4}
          >
            <View
              paddingVertical={theme.space.xs}
              paddingHorizontal={theme.space.sm}
              borderRadius={theme.radius.full}
              borderColor={theme.border}
              borderWidth={1}
              marginRight={theme.space.xs}
              marginBottom={theme.space.xs}
            >
              <Text color={theme.text.secondary} fontSize={theme.type.caption.size}>
                {p.name}
              </Text>
            </View>
          </Pressable>
        ))}
        {value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={4}>
            <View
              paddingVertical={theme.space.xs}
              paddingHorizontal={theme.space.sm}
              borderRadius={theme.radius.full}
              backgroundColor={theme.status.danger}
              marginBottom={theme.space.xs}
            >
              <Text color={theme.bg} fontSize={theme.type.caption.size} fontWeight="700">
                Clear
              </Text>
            </View>
          </Pressable>
        ) : null}
      </View>
      <Input
        value={value ?? ''}
        onChangeText={(t) => onChange(t.length > 0 ? t : null)}
        placeholder="twa/tws  6  8  10  12 …"
        multiline
        minHeight={120}
        paddingHorizontal={theme.space.md}
        paddingVertical={theme.space.sm}
        fontSize={theme.type.caption.size}
        borderColor={theme.border}
        backgroundColor={theme.surface}
        color={theme.text.primary}
        placeholderTextColor={theme.text.muted}
        textAlignVertical="top"
        autoCapitalize="none"
      />
    </View>
  );
}
