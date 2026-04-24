/**
 * Dev-only diagnostics overlay. Renders as a floating pill top-left; tap
 * to expand into a full diagnostics sheet.
 *
 * Mounts only when __DEV__ is true (see App.tsx). All data is read from
 * useBoatStore — the panel never mounts its own GPS watcher or network
 * poller (those belong to useLiveTelemetry, called once at the root).
 */

import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { Text, View } from 'tamagui';

import { useBoatStore } from '../stores/useBoatStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';

export interface DevPanelExtraRow {
  label: string;
  value: string;
}

export interface DevPanelProps {
  extra?: DevPanelExtraRow[];
}

export function DevPanel({ extra }: DevPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const nightMode = useSettingsStore((state) => state.nightMode);
  const theme = getTheme(nightMode ? 'night' : 'day');

  const boat = useBoatStore();

  const rows: DevPanelExtraRow[] = [
    { label: 'permission', value: boat.permissionStatus },
    { label: 'gps error', value: boat.gpsError ?? '—' },
    { label: 'lat', value: boat.position ? boat.position.latitude.toFixed(5) : 'null' },
    { label: 'lon', value: boat.position ? boat.position.longitude.toFixed(5) : 'null' },
    { label: 'sog (m/s)', value: boat.sog === null ? 'null' : boat.sog.toFixed(3) },
    { label: 'cog (°)', value: boat.cog === null ? 'null' : boat.cog.toFixed(1) },
    { label: 'heading (°)', value: boat.heading === null ? 'null' : boat.heading.toFixed(1) },
    { label: 'accuracy (m)', value: boat.accuracy === null ? 'null' : boat.accuracy.toFixed(1) },
    { label: 'last update', value: boat.lastUpdate ?? 'null' },
    { label: 'connectivity', value: boat.connectivity },
    { label: 'app mode', value: boat.mode },
    ...(extra ?? []),
  ];

  const dotColour =
    boat.permissionStatus === 'granted' ? theme.status.success : theme.status.warning;

  if (!expanded) {
    return (
      <Pressable onPress={() => setExpanded(true)} accessibilityLabel="Open dev panel">
        <View
          position="absolute"
          bottom={32}
          right={16}
          backgroundColor={theme.surface}
          borderColor={theme.border}
          borderWidth={1}
          borderRadius={theme.radius.full}
          paddingHorizontal={theme.space.sm}
          paddingVertical={theme.space.xs}
          zIndex={9999}
          flexDirection="row"
          alignItems="center"
          style={theme.elevation.card}
        >
          <View
            width={6}
            height={6}
            borderRadius={theme.radius.full}
            backgroundColor={dotColour}
            marginRight={theme.space.xs}
          />
          <Text
            color={theme.text.secondary}
            fontSize={theme.type.micro.size}
            fontWeight={theme.type.micro.weight as '600'}
            letterSpacing={theme.type.micro.letterSpacing}
          >
            DEV
          </Text>
        </View>
      </Pressable>
    );
  }

  async function copyDiagnostics() {
    const payload = rows.map((r) => `${r.label}: ${r.value}`).join('\n');
    await Clipboard.setStringAsync(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <View
      position="absolute"
      top={60}
      left={16}
      right={16}
      maxHeight={400}
      backgroundColor={theme.surface}
      borderColor={theme.border}
      borderWidth={1}
      borderRadius={theme.radius.lg}
      paddingHorizontal={theme.space.md}
      paddingVertical={theme.space.sm}
      zIndex={9999}
      style={theme.elevation.modal}
    >
      <View
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        marginBottom={theme.space.sm}
      >
        <Text
          color={theme.text.primary}
          fontSize={theme.type.h3.size}
          fontWeight={theme.type.h3.weight as '600'}
        >
          Dev diagnostics
        </Text>
        <View flexDirection="row" alignItems="center">
          <Pressable onPress={copyDiagnostics} accessibilityLabel="Copy diagnostics to clipboard">
            <View
              paddingHorizontal={theme.space.sm}
              paddingVertical={theme.space.xs}
              borderRadius={theme.radius.md}
              backgroundColor={copied ? theme.status.success : theme.accent}
              marginRight={theme.space.sm}
            >
              <Text
                color={theme.bg}
                fontSize={theme.type.caption.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
              >
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={() => setExpanded(false)} accessibilityLabel="Close dev panel">
            <Text
              color={theme.text.muted}
              fontSize={theme.type.body.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
              paddingHorizontal={theme.space.sm}
            >
              ✕
            </Text>
          </Pressable>
        </View>
      </View>
      <ScrollView>
        {rows.map((row) => (
          <View key={row.label} flexDirection="row" justifyContent="space-between" paddingVertical={2}>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.caption.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
              flex={1}
            >
              {row.label}
            </Text>
            <Text
              color={theme.text.primary}
              fontSize={theme.type.caption.size}
              style={{ fontFamily: 'Menlo' }}
              flex={2}
              textAlign="right"
              numberOfLines={1}
            >
              {row.value}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
