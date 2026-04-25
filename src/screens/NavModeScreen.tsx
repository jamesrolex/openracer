/**
 * NavModeScreen — Phase 1.16.
 *
 * The cruising / passage-making home view. Three things:
 *   1. Big SOG/COG (re-using BigNumber so it matches BigNumbersDashboard)
 *   2. Track recorder — Start track / Stop track button + live stats
 *   3. Waypoints — drop-current-position, list, navigate-to (line-of-sight
 *      bearing + distance for now; chart routing waits for Phase 2)
 *
 * Saved tracks list at the bottom — tap to drill into stats / GPX export
 * (re-uses RaceSession-style detail pattern; Phase 1.16+ work).
 *
 * Naming: nav-mode entities are **waypoints**, not marks. Marks are racing
 * buoys with tier / source / colour-hint metadata; waypoints are nav
 * destinations with just name + lat/lon. Different mental model, different
 * table, different screen.
 */

import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Text, View } from 'tamagui';

import type { RootStackScreenProps } from '../navigation';
import {
  createWaypoint,
  deleteWaypoint,
  listWaypoints,
  type Waypoint,
} from '../stores/waypointsRepo';
import {
  listCruiseTracks,
  type CruiseTrack,
} from '../stores/cruiseTrackRepo';
import { useBoatStore } from '../stores/useBoatStore';
import { useCruiseTrackStore } from '../stores/useCruiseTrackStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import { bearingBetween, distanceBetween } from '../utils/geo';
import {
  formatBearing,
  formatLatLon,
  metresPerSecondToKnots,
} from '../utils/format';

export function NavModeScreen({ navigation }: RootStackScreenProps<'NavMode'>) {
  const themeVariant = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeVariant);

  const position = useBoatStore((s) => s.position);
  const sog = useBoatStore((s) => s.sog);
  const cog = useBoatStore((s) => s.cog);

  const activeTrack = useCruiseTrackStore((s) => s.activeTrack);
  const liveDistance = useCruiseTrackStore((s) => s.liveDistanceMetres);
  const livePoints = useCruiseTrackStore((s) => s.livePointCount);
  const startTrack = useCruiseTrackStore((s) => s.start);
  const stopTrack = useCruiseTrackStore((s) => s.stop);
  const hydrate = useCruiseTrackStore((s) => s.hydrate);

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [savedTracks, setSavedTracks] = useState<CruiseTrack[]>([]);
  const [draftName, setDraftName] = useState('');

  async function refresh() {
    const [w, t] = await Promise.all([listWaypoints(), listCruiseTracks()]);
    setWaypoints(w);
    setSavedTracks(t);
  }

  useEffect(() => {
    void hydrate();
    void refresh();
  }, [hydrate]);

  // Refresh saved tracks when an active track stops, so the list updates
  // immediately without a screen re-mount.
  useEffect(() => {
    void refresh();
  }, [activeTrack?.id]);

  const sogKn = sog !== null ? metresPerSecondToKnots(sog) : null;
  const cogDisplay = cog === null ? '—' : `${Math.round(cog).toString().padStart(3, '0')}°`;

  async function dropWaypointHere() {
    if (!position) {
      Alert.alert('No GPS fix', 'Wait until you have a position before dropping a waypoint.');
      return;
    }
    const name = draftName.trim() || `Waypoint ${waypoints.length + 1}`;
    await createWaypoint({
      name,
      latitude: position.latitude,
      longitude: position.longitude,
    });
    setDraftName('');
    await refresh();
  }

  async function confirmDeleteWaypoint(w: Waypoint) {
    Alert.alert(`Delete "${w.name}"?`, 'This removes the waypoint locally.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWaypoint(w.id);
          await refresh();
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
            Nav
          </Text>
          <View width={44} />
        </View>

        {/* SOG / COG strip */}
        <View
          flexDirection="row"
          justifyContent="space-around"
          paddingVertical={theme.space.md}
          marginBottom={theme.space.md}
          borderRadius={theme.radius.lg}
          borderColor={theme.border}
          borderWidth={1}
        >
          <Stat
            theme={theme}
            label="SOG"
            value={sogKn === null ? '—' : sogKn.toFixed(1)}
            unit="kn"
          />
          <Stat theme={theme} label="COG" value={cogDisplay} unit="" />
        </View>

        {/* Track recorder */}
        <Label theme={theme}>Track</Label>
        {activeTrack ? (
          <View
            padding={theme.space.md}
            marginBottom={theme.space.md}
            borderRadius={theme.radius.lg}
            backgroundColor={theme.status.success}
          >
            <View
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              marginBottom={theme.space.xs}
            >
              <Text
                color={theme.bg}
                fontSize={theme.type.bodySemi.size}
                fontWeight="700"
              >
                ● Recording
              </Text>
              <Text
                color={theme.bg}
                fontSize={theme.type.body.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
                style={{ fontFamily: 'Menlo' }}
              >
                {(liveDistance / 1852).toFixed(2)} nm
              </Text>
            </View>
            <Text color={theme.bg} fontSize={theme.type.caption.size} opacity={0.85}>
              {activeTrack.name} · {livePoints} pts
            </Text>
            <Pressable onPress={() => void stopTrack()} hitSlop={8}>
              <View
                marginTop={theme.space.sm}
                paddingVertical={theme.space.sm}
                paddingHorizontal={theme.space.md}
                borderRadius={theme.radius.full}
                backgroundColor={theme.bg}
                alignItems="center"
              >
                <Text
                  color={theme.text.primary}
                  fontSize={theme.type.bodySemi.size}
                  fontWeight="700"
                >
                  Stop track
                </Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => void startTrack()} hitSlop={8}>
            <View
              padding={theme.space.md}
              marginBottom={theme.space.md}
              borderRadius={theme.radius.lg}
              backgroundColor={theme.accent}
              alignItems="center"
            >
              <Text
                color={theme.bg}
                fontSize={theme.type.bodySemi.size}
                fontWeight="700"
              >
                ▶ Start track
              </Text>
              <Text
                color={theme.bg}
                fontSize={theme.type.caption.size}
                opacity={0.85}
                marginTop={2}
              >
                Records GPS at 1 Hz until you tap Stop.
              </Text>
            </View>
          </Pressable>
        )}

        {/* Waypoints */}
        <Label theme={theme}>Waypoints</Label>
        <View
          padding={theme.space.md}
          marginBottom={theme.space.md}
          borderRadius={theme.radius.lg}
          borderColor={theme.border}
          borderWidth={1}
        >
          <View flexDirection="row" alignItems="center" marginBottom={theme.space.sm}>
            <Input
              flex={1}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Name (or leave blank)"
              height={44}
              paddingHorizontal={theme.space.md}
              fontSize={theme.type.body.size}
              borderColor={theme.border}
              backgroundColor={theme.surface}
              color={theme.text.primary}
              placeholderTextColor={theme.text.muted}
              marginRight={theme.space.sm}
            />
            <Pressable onPress={() => void dropWaypointHere()} hitSlop={8}>
              <View
                paddingVertical={theme.space.sm}
                paddingHorizontal={theme.space.md}
                borderRadius={theme.radius.full}
                backgroundColor={theme.accent}
              >
                <Text
                  color={theme.bg}
                  fontSize={theme.type.body.size}
                  fontWeight="700"
                >
                  + Drop here
                </Text>
              </View>
            </Pressable>
          </View>

          {waypoints.length === 0 ? (
            <Text color={theme.text.muted} fontSize={theme.type.caption.size}>
              No waypoints yet. Tap &ldquo;Drop here&rdquo; to save your current GPS
              position.
            </Text>
          ) : (
            waypoints.map((w, idx) => (
              <WaypointRow
                key={w.id}
                theme={theme}
                waypoint={w}
                position={position}
                onLongPress={() => void confirmDeleteWaypoint(w)}
                bordered={idx < waypoints.length - 1}
              />
            ))
          )}
        </View>

        {/* Saved tracks */}
        <Label theme={theme}>Saved tracks</Label>
        {savedTracks.length === 0 ? (
          <Text
            color={theme.text.muted}
            fontSize={theme.type.caption.size}
            paddingVertical={theme.space.sm}
          >
            No saved tracks yet.
          </Text>
        ) : (
          savedTracks
            .filter((t) => t.endedAt !== null)
            .map((t) => (
              <View
                key={t.id}
                padding={theme.space.md}
                marginBottom={theme.space.sm}
                borderRadius={theme.radius.lg}
                borderColor={theme.border}
                borderWidth={1}
              >
                <Text
                  color={theme.text.primary}
                  fontSize={theme.type.body.size}
                  fontWeight={theme.type.bodySemi.weight as '600'}
                >
                  {t.name}
                </Text>
                <View
                  flexDirection="row"
                  justifyContent="space-between"
                  marginTop={theme.space.xs}
                >
                  <Text color={theme.text.muted} fontSize={theme.type.caption.size}>
                    {new Date(t.startedAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text
                    color={theme.text.primary}
                    fontSize={theme.type.caption.size}
                    style={{ fontFamily: 'Menlo' }}
                  >
                    {(t.distanceMetres / 1852).toFixed(2)} nm · {t.pointCount} pts
                  </Text>
                </View>
              </View>
            ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Label({
  theme,
  children,
}: {
  theme: ReturnType<typeof getTheme>;
  children: React.ReactNode;
}) {
  return (
    <Text
      color={theme.text.muted}
      fontSize={theme.type.label.size}
      fontWeight={theme.type.label.weight as '600'}
      letterSpacing={theme.type.label.letterSpacing}
      marginBottom={theme.space.xs}
    >
      {(children as string).toUpperCase()}
    </Text>
  );
}

function Stat({
  theme,
  label,
  value,
  unit,
}: {
  theme: ReturnType<typeof getTheme>;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View alignItems="center" flex={1}>
      <Text
        color={theme.text.muted}
        fontSize={theme.type.micro.size}
        fontWeight={theme.type.micro.weight as '600'}
        letterSpacing={theme.type.micro.letterSpacing}
      >
        {label}
      </Text>
      <View flexDirection="row" alignItems="baseline" marginTop={theme.space.xxs}>
        <Text
          color={theme.text.primary}
          fontSize={theme.type.h1.size}
          fontWeight="700"
          style={{ fontFamily: 'Menlo' }}
        >
          {value}
        </Text>
        {unit ? (
          <Text
            color={theme.text.muted}
            fontSize={theme.type.body.size}
            marginLeft={4}
          >
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function WaypointRow({
  theme,
  waypoint,
  position,
  bordered,
  onLongPress,
}: {
  theme: ReturnType<typeof getTheme>;
  waypoint: Waypoint;
  position: { latitude: number; longitude: number } | null;
  bordered: boolean;
  onLongPress: () => void;
}) {
  const { bearing, distanceNm } = useMemo(() => {
    if (!position) return { bearing: null, distanceNm: null };
    const target = {
      latitude: waypoint.latitude,
      longitude: waypoint.longitude,
    };
    return {
      bearing: bearingBetween(position, target),
      distanceNm: distanceBetween(position, target) / 1852,
    };
  }, [position, waypoint]);

  return (
    <Pressable onLongPress={onLongPress} delayLongPress={500}>
      <View
        paddingVertical={theme.space.sm}
        borderBottomWidth={bordered ? 1 : 0}
        borderBottomColor={theme.border}
      >
        <View
          flexDirection="row"
          alignItems="baseline"
          justifyContent="space-between"
        >
          <Text
            color={theme.text.primary}
            fontSize={theme.type.body.size}
            fontWeight={theme.type.bodySemi.weight as '600'}
            flex={1}
            paddingRight={theme.space.sm}
          >
            {waypoint.name}
          </Text>
          {bearing !== null && distanceNm !== null ? (
            <Text
              color={theme.text.primary}
              fontSize={theme.type.bodySemi.size}
              fontWeight="700"
              style={{ fontFamily: 'Menlo' }}
            >
              {formatBearing(bearing)} · {distanceNm.toFixed(2)} nm
            </Text>
          ) : null}
        </View>
        <Text
          color={theme.text.muted}
          fontSize={theme.type.caption.size}
          marginTop={2}
        >
          {formatLatLon(waypoint.latitude, waypoint.longitude, 'dmm')}
        </Text>
      </View>
    </Pressable>
  );
}
