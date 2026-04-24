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
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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

  const styles = StyleSheet.create({
    pill: {
      position: 'absolute',
      bottom: 32,
      right: 16,
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.space.sm,
      paddingVertical: theme.space.xs,
      zIndex: 9999,
      flexDirection: 'row',
      alignItems: 'center',
      ...theme.elevation.card,
    },
    pillDot: {
      width: 6,
      height: 6,
      borderRadius: theme.radius.full,
      backgroundColor: boat.permissionStatus === 'granted' ? theme.status.success : theme.status.warning,
      marginRight: theme.space.xs,
    },
    pillText: {
      color: theme.text.secondary,
      fontSize: theme.type.micro.size,
      fontWeight: theme.type.micro.weight as '600',
      letterSpacing: theme.type.micro.letterSpacing,
    },
    sheet: {
      position: 'absolute',
      top: 60,
      left: 16,
      right: 16,
      maxHeight: 400,
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.space.md,
      paddingVertical: theme.space.sm,
      zIndex: 9999,
      ...theme.elevation.modal,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.space.sm,
    },
    headerTitle: {
      color: theme.text.primary,
      fontSize: theme.type.h3.size,
      fontWeight: theme.type.h3.weight as '600',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    copyButton: {
      paddingHorizontal: theme.space.sm,
      paddingVertical: theme.space.xs,
      borderRadius: theme.radius.md,
      backgroundColor: copied ? theme.status.success : theme.accent,
      marginRight: theme.space.sm,
    },
    copyButtonText: {
      color: theme.bg,
      fontSize: theme.type.caption.size,
      fontWeight: theme.type.bodySemi.weight as '600',
    },
    headerClose: {
      color: theme.text.muted,
      fontSize: theme.type.body.size,
      fontWeight: theme.type.bodySemi.weight as '600',
      paddingHorizontal: theme.space.sm,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 2,
    },
    rowLabel: {
      color: theme.text.muted,
      fontSize: theme.type.caption.size,
      fontWeight: theme.type.bodySemi.weight as '600',
      flex: 1,
    },
    rowValue: {
      color: theme.text.primary,
      fontSize: theme.type.caption.size,
      fontFamily: 'Menlo',
      flex: 2,
      textAlign: 'right',
    },
  });

  if (!expanded) {
    return (
      <Pressable onPress={() => setExpanded(true)} style={styles.pill} accessibilityLabel="Open dev panel">
        <View style={styles.pillDot} />
        <Text style={styles.pillText}>DEV</Text>
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
    <View style={styles.sheet}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dev diagnostics</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={copyDiagnostics}
            style={styles.copyButton}
            accessibilityLabel="Copy diagnostics to clipboard"
          >
            <Text style={styles.copyButtonText}>{copied ? 'Copied' : 'Copy'}</Text>
          </Pressable>
          <Pressable onPress={() => setExpanded(false)} accessibilityLabel="Close dev panel">
            <Text style={styles.headerClose}>✕</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {row.value}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
