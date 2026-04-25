/**
 * HomeScreen. Reads boat state from useBoatStore. The actual GPS and
 * connectivity hooks are driven once by useLiveTelemetry (mounted in
 * App.tsx) — this screen is a pure reader.
 *
 * Layout (see skills/design-system "Primary data screen"):
 *   [ConnectionBadge]                          [ModeToggle]
 *
 *       SOG                 COG
 *        6.2                 284
 *        kn                  °
 *
 *       LAT                 LON
 *       52.8205             -4.5025
 *
 *   GPS ±3 m · updated 1 s ago                    [Marks →]
 */

import { Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';

import { BigNumber } from '../components/BigNumber';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { CourseStrip } from '../components/CourseStrip';
import { ModeToggle } from '../components/ModeToggle';
import { StartLineReadout } from '../components/StartLineReadout';
import { makeSnapshot } from '../domain/raceTimer';
import type { RootStackScreenProps } from '../navigation';
import { useBoatStore } from '../stores/useBoatStore';
import { useCoursesStore } from '../stores/useCoursesStore';
import { useMarksStore } from '../stores/useMarksStore';
import { useRaceStore } from '../stores/useRaceStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTripStore } from '../stores/useTripStore';
import { getTheme } from '../theme/theme';
import { formatBearing, formatDistance, formatLatLon, metresPerSecondToKnots } from '../utils/format';

const STALE_AFTER_MS = 3000;
const PLACEHOLDER = '—';

export function HomeScreen({ navigation }: RootStackScreenProps<'Home'>) {
  const themeVariant = useSettingsStore((state) => state.theme);
  const theme = getTheme(themeVariant);

  const draft = useCoursesStore((state) => state.activeDraft);
  const marks = useMarksStore((state) => state.marks);
  const sequenceStartTime = useRaceStore((state) => state.sequenceStartTime);
  const raceSequence = useRaceStore((state) => state.sequence);

  const position = useBoatStore((state) => state.position);
  const sog = useBoatStore((state) => state.sog);
  const cog = useBoatStore((state) => state.cog);
  const accuracy = useBoatStore((state) => state.accuracy);
  const lastUpdate = useBoatStore((state) => state.lastUpdate);
  const mode = useBoatStore((state) => state.mode);
  const connectivity = useBoatStore((state) => state.connectivity);
  const permissionStatus = useBoatStore((state) => state.permissionStatus);
  const setMode = useBoatStore((state) => state.setMode);

  const tripMetres = useTripStore((s) => s.distanceMetres);
  const tripStartedAt = useTripStore((s) => s.startedAt);
  const tripMaxSog = useTripStore((s) => s.maxSogMps);
  const tripReset = useTripStore((s) => s.reset);

  const now = Date.now();
  const lastUpdateMs = lastUpdate ? new Date(lastUpdate).getTime() : null;
  const stale = lastUpdateMs === null ? true : now - lastUpdateMs > STALE_AFTER_MS;

  const sogDisplay = sog === null ? PLACEHOLDER : metresPerSecondToKnots(sog).toFixed(1);
  const cogDisplay = cog === null ? PLACEHOLDER : formatBearing(cog).replace('°', '');
  const { lat: latDisplay, lon: lonDisplay } = splitLatLonForDisplay(position);

  const accuracyDisplay = accuracy === null ? PLACEHOLDER : `GPS ${formatDistance(accuracy, 'm')}`;
  const freshnessDisplay =
    lastUpdateMs === null ? 'waiting for fix' : `updated ${describeAge(now - lastUpdateMs)}`;

  const sogEmphasis = sog === null ? 'muted' : 'primary';
  const cogEmphasis = cog === null ? 'muted' : 'primary';
  const latEmphasis = position === null ? 'muted' : 'secondary';
  const lonEmphasis = position === null ? 'muted' : 'secondary';

  const variant = themeVariant;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <View
        flex={1}
        paddingHorizontal={theme.space.md}
        paddingTop={theme.space.sm}
        paddingBottom={theme.space.md}
      >
        <View
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          marginBottom={theme.space.md}
        >
          <View flexDirection="row" alignItems="center">
            <ConnectionBadge mode={connectivity} variant={variant} />
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              hitSlop={8}
              accessibilityLabel="Settings"
            >
              <View
                marginLeft={theme.space.sm}
                width={32}
                height={32}
                borderRadius={theme.radius.full}
                borderColor={theme.border}
                borderWidth={1}
                backgroundColor={theme.surface}
                alignItems="center"
                justifyContent="center"
              >
                <Text color={theme.text.secondary} fontSize={16}>
                  ⚙
                </Text>
              </View>
            </Pressable>
          </View>
          <ModeToggle mode={mode} onChange={setMode} variant={variant} />
        </View>

        {sequenceStartTime ? (
          <View marginBottom={theme.space.md}>
            <StartLineReadout
              course={draft}
              marks={marks}
              position={position}
              cog={cog}
              sog={sog}
              urgent={
                makeSnapshot(sequenceStartTime, new Date(), raceSequence).band === 'urgent'
              }
              variant={variant}
            />
          </View>
        ) : null}

        {draft ? (
          <View marginBottom={theme.space.md}>
            <CourseStrip
              course={draft}
              variant={variant}
              onPress={() => navigation.navigate('CourseEntry')}
            />
          </View>
        ) : (
          <Pressable
            onPress={() => navigation.navigate('CourseEntry')}
            hitSlop={4}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              marginBottom: theme.space.md,
            })}
            accessibilityLabel="Build course"
          >
            <View
              paddingVertical={theme.space.sm}
              paddingHorizontal={theme.space.md}
              borderRadius={theme.radius.lg}
              borderWidth={1}
              borderColor={theme.accent}
              backgroundColor="transparent"
              alignItems="center"
            >
              <Text
                color={theme.accent}
                fontSize={theme.type.body.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
              >
                Build course →
              </Text>
            </View>
          </Pressable>
        )}

        <View flex={1} justifyContent="space-evenly">
          <View flexDirection="row">
            <BigNumber label="SOG" value={sogDisplay} unit="kn" emphasis={sogEmphasis} stale={stale} variant={variant} />
            <BigNumber label="COG" value={cogDisplay} unit="°" emphasis={cogEmphasis} stale={stale} variant={variant} />
          </View>
          <View flexDirection="row">
            <BigNumber label="LAT" value={latDisplay} emphasis={latEmphasis} stale={stale} variant={variant} />
            <BigNumber label="LON" value={lonDisplay} emphasis={lonEmphasis} stale={stale} variant={variant} />
          </View>
        </View>

        <Text
          color={theme.text.muted}
          fontSize={theme.type.caption.size}
          fontWeight={theme.type.caption.weight as '400'}
          lineHeight={theme.type.caption.lineHeight}
          marginTop={theme.space.sm}
        >
          {accuracyDisplay} · {freshnessDisplay}
        </Text>

        {mode === 'cruise' ? (
          <TripOdometer
            theme={theme}
            metres={tripMetres}
            startedAt={tripStartedAt}
            maxSogMps={tripMaxSog}
            onReset={() =>
              Alert.alert(
                'Reset trip?',
                'Zero the distance counter and start a new trip from here.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reset', style: 'destructive', onPress: () => tripReset() },
                ],
              )
            }
          />
        ) : null}

        <View flexDirection="row" marginTop={theme.space.sm}>
          {sequenceStartTime ? (
            <HomeButton
              label="Open timer"
              onPress={() => navigation.navigate('RaceTimer')}
              variant="primary"
              theme={theme}
            />
          ) : (
            <HomeButton
              label="Marks"
              onPress={() => navigation.navigate('MarkLibrary')}
              variant="primary"
              theme={theme}
            />
          )}
        </View>

        {!sequenceStartTime ? (
          <>
            <Pressable
              onPress={() => navigation.navigate('CruiseDisplay')}
              accessibilityLabel="Cruise display"
              hitSlop={8}
            >
              <Text
                color={theme.accent}
                fontSize={theme.type.caption.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
                textAlign="center"
                marginTop={theme.space.sm}
              >
                ◐ Cruise display — wind / VMG / big numbers
              </Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('ScanCoursePush')}
              accessibilityLabel="Scan QR"
              hitSlop={8}
            >
              <Text
                color={theme.text.muted}
                fontSize={theme.type.caption.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
                textAlign="center"
                marginTop={theme.space.xs}
              >
                ⌧ Scan QR — join a boat / accept a course
              </Text>
            </Pressable>
          </>
        ) : null}

        {permissionStatus === 'denied' ? (
          <Text
            color={theme.text.secondary}
            fontSize={theme.type.body.size}
            lineHeight={theme.type.body.lineHeight}
            textAlign="center"
            paddingHorizontal={theme.space.lg}
            marginTop={theme.space.md}
          >
            Location access is off. Open Settings to enable it for OpenRacer — the app needs GPS
            to show your boat&apos;s position.
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function TripOdometer({
  theme,
  metres,
  startedAt,
  maxSogMps,
  onReset,
}: {
  theme: ReturnType<typeof getTheme>;
  metres: number;
  startedAt: string | null;
  maxSogMps: number;
  onReset: () => void;
}) {
  const nm = metres / 1852;
  const nmDisplay = nm < 10 ? nm.toFixed(2) : nm.toFixed(1);
  const maxSogKn = maxSogMps * 1.9438444924;
  const since = startedAt ? new Date(startedAt) : null;
  const sinceDisplay = since
    ? `since ${since.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ${since.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : 'not started';

  return (
    <View
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      padding={theme.space.sm}
      marginTop={theme.space.sm}
      borderRadius={theme.radius.md}
      borderColor={theme.border}
      borderWidth={1}
      backgroundColor={theme.surface}
    >
      <View>
        <Text
          color={theme.text.muted}
          fontSize={theme.type.micro.size}
          fontWeight={theme.type.micro.weight as '600'}
          letterSpacing={theme.type.micro.letterSpacing}
        >
          TRIP
        </Text>
        <Text
          color={theme.text.primary}
          fontSize={theme.type.h2.size}
          fontWeight={theme.type.h2.weight as '600'}
          style={{ fontFamily: 'Menlo' }}
        >
          {nmDisplay} nm
        </Text>
        <Text color={theme.text.muted} fontSize={theme.type.caption.size}>
          {sinceDisplay}
          {maxSogKn > 0 ? ` · max ${maxSogKn.toFixed(1)} kn` : ''}
        </Text>
      </View>

      <Pressable onPress={onReset} accessibilityLabel="Reset trip">
        <View
          paddingVertical={theme.space.xs}
          paddingHorizontal={theme.space.md}
          borderRadius={theme.radius.full}
          borderColor={theme.border}
          borderWidth={1}
        >
          <Text
            color={theme.text.secondary}
            fontSize={theme.type.caption.size}
            fontWeight={theme.type.bodySemi.weight as '600'}
          >
            Reset
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

function HomeButton({
  label,
  onPress,
  variant,
  theme,
}: {
  label: string;
  onPress: () => void;
  variant: 'primary' | 'outline';
  theme: ReturnType<typeof getTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flex: 1 })}
    >
      <View
        minHeight={44}
        paddingVertical={theme.space.sm}
        paddingHorizontal={theme.space.sm}
        marginHorizontal={theme.space.xxs}
        borderRadius={theme.radius.full}
        backgroundColor={variant === 'primary' ? theme.accent : 'transparent'}
        borderColor={theme.accent}
        borderWidth={1}
        alignItems="center"
        justifyContent="center"
      >
        <Text
          color={variant === 'primary' ? theme.bg : theme.accent}
          fontSize={theme.type.bodySemi.size}
          fontWeight={theme.type.bodySemi.weight as '600'}
          lineHeight={theme.type.bodySemi.lineHeight}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function splitLatLonForDisplay(
  position: { latitude: number; longitude: number } | null,
): { lat: string; lon: string } {
  if (position === null) return { lat: PLACEHOLDER, lon: PLACEHOLDER };
  const combined = formatLatLon(position.latitude, position.longitude, 'decimal');
  const [lat, lon] = combined.split(', ');
  return { lat: lat ?? PLACEHOLDER, lon: lon ?? PLACEHOLDER };
}

function describeAge(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} h ago`;
}
