/**
 * DashboardSelector — fullscreen container that holds the dashboard
 * catalogue.
 *
 * Layout:
 *   ┌─────────────────────────────────────────┐
 *   │  ◀  Race countdown  ▶          •••     │  ← chrome strip
 *   ├─────────────────────────────────────────┤
 *   │                                         │
 *   │       (active dashboard fills here)     │
 *   │                                         │
 *   └─────────────────────────────────────────┘
 *
 * Interactions:
 *   - Tap chevrons to step.
 *   - Horizontal swipe (>40px, 3:1 dx:dy) cycles the active dashboard.
 *   - Tap "•••" opens an inline list-picker overlay.
 *   - Long-press anywhere on the active dashboard reveals an exit
 *     button — the dashboard component itself is the long-press target,
 *     wrapped here so the dashboard never has to know about exit.
 *
 * Persistence:
 *   - The selected dashboard id is reported up via `onDashboardChange`;
 *     the caller persists it (per mode) into useSettingsStore.
 *
 * Theme + mode awareness:
 *   - `mode` filters the catalogue: 'race' hides cruise-only, 'cruise'
 *     hides race-only.
 *   - `variant` is propagated into each dashboard.
 */

import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable } from 'react-native';
import { Text, View } from 'tamagui';

import {
  dashboardCatalogue,
  dashboardsForMode,
  type DashboardDefinition,
} from '../dashboards';
import { getTheme, type ThemeVariant } from '../theme/theme';

interface Props {
  variant: ThemeVariant;
  mode: 'race' | 'cruise';
  /** The dashboard the selector should show on first render. If null or
   *  the id isn't in the filtered list, defaults to the first dashboard
   *  available for the mode. */
  initialDashboardId: string | null;
  /** Called whenever the active dashboard id changes. Caller persists. */
  onDashboardChange: (dashboardId: string) => void;
  /** Called when the user long-presses + taps "Show controls". */
  onExit: () => void;
}

const SWIPE_DX_MIN = 40;
const SWIPE_DXDY_RATIO = 3;

export function DashboardSelector({
  variant,
  mode,
  initialDashboardId,
  onDashboardChange,
  onExit,
}: Props) {
  const theme = getTheme(variant);
  const available = useMemo(() => dashboardsForMode(dashboardCatalogue, mode), [mode]);

  const [activeIndex, setActiveIndex] = useState<number>(() => {
    const idx = available.findIndex((d) => d.id === initialDashboardId);
    return idx >= 0 ? idx : 0;
  });
  const [showExit, setShowExit] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Keep activeIndex in range if the catalogue changes mode mid-render.
  const safeIndex = Math.min(activeIndex, Math.max(0, available.length - 1));
  const active: DashboardDefinition | null = available[safeIndex] ?? null;

  function step(direction: 1 | -1) {
    if (available.length === 0) return;
    const next = (safeIndex + direction + available.length) % available.length;
    const nextDashboard = available[next];
    if (!nextDashboard) return;
    setActiveIndex(next);
    onDashboardChange(nextDashboard.id);
  }

  function jumpTo(id: string) {
    const idx = available.findIndex((d) => d.id === id);
    if (idx >= 0) {
      setActiveIndex(idx);
      onDashboardChange(id);
    }
    setShowPicker(false);
  }

  // PanResponder lives in a ref so we don't recreate it every render —
  // the responder closure captures `step` via the latest closure scope.
  const stepRef = useRef(step);
  stepRef.current = step;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderRelease: (_, gesture) => {
        const { dx, dy } = gesture;
        if (
          Math.abs(dx) > SWIPE_DX_MIN &&
          Math.abs(dx) > Math.abs(dy) * SWIPE_DXDY_RATIO
        ) {
          stepRef.current(dx < 0 ? 1 : -1);
        }
      },
    }),
  ).current;

  if (!active) {
    return (
      <View
        flex={1}
        backgroundColor={theme.bg}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal={theme.space.lg}
      >
        <Text
          color={theme.text.primary}
          fontSize={theme.type.h2.size}
          fontWeight="700"
          marginBottom={theme.space.sm}
        >
          No dashboards available
        </Text>
        <Text color={theme.text.muted} fontSize={theme.type.body.size}>
          Add a dashboard to the catalogue.
        </Text>
      </View>
    );
  }

  const ActiveComponent = active.Component;

  return (
    <View flex={1} backgroundColor={theme.bg}>
      {/* Chrome strip */}
      <View
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={theme.space.md}
        paddingVertical={theme.space.sm}
        borderBottomWidth={1}
        borderBottomColor={theme.border}
      >
        <Pressable onPress={() => step(-1)} hitSlop={12} accessibilityLabel="Previous dashboard">
          <Text color={theme.text.muted} fontSize={theme.type.h2.size} fontWeight="700">
            ◀
          </Text>
        </Pressable>

        <Pressable onPress={() => setShowPicker((v) => !v)} hitSlop={8}>
          <View flexDirection="row" alignItems="center">
            <Text
              color={theme.text.primary}
              fontSize={theme.type.bodySemi.size}
              fontWeight="700"
            >
              {active.name}
            </Text>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.caption.size}
              marginLeft={theme.space.xs}
            >
              {safeIndex + 1}/{available.length}
            </Text>
          </View>
        </Pressable>

        <Pressable onPress={() => step(1)} hitSlop={12} accessibilityLabel="Next dashboard">
          <Text color={theme.text.muted} fontSize={theme.type.h2.size} fontWeight="700">
            ▶
          </Text>
        </Pressable>
      </View>

      {/* Inline picker — list of available dashboards */}
      {showPicker ? (
        <View
          backgroundColor={theme.surface}
          borderBottomWidth={1}
          borderBottomColor={theme.border}
        >
          {available.map((d, idx) => (
            <Pressable key={d.id} onPress={() => jumpTo(d.id)}>
              <View
                paddingVertical={theme.space.sm}
                paddingHorizontal={theme.space.md}
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
                backgroundColor={
                  idx === safeIndex ? theme.border : theme.surface
                }
              >
                <Text
                  color={theme.text.primary}
                  fontSize={theme.type.body.size}
                  fontWeight={idx === safeIndex ? '700' : '500'}
                >
                  {d.name}
                </Text>
                <Text
                  color={theme.text.muted}
                  fontSize={theme.type.caption.size}
                  letterSpacing={1}
                >
                  {d.category.toUpperCase()}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Active dashboard — wrapped so we can intercept long-press for exit */}
      <Pressable
        onLongPress={() => setShowExit(true)}
        delayLongPress={600}
        style={{ flex: 1 }}
        accessibilityLabel="Long-press to show controls"
      >
        <View flex={1} {...panResponder.panHandlers}>
          <ActiveComponent variant={variant} />
        </View>
      </Pressable>

      {/* Exit affordance — only after long-press */}
      {showExit ? (
        <View
          position="absolute"
          left={0}
          right={0}
          bottom={0}
          padding={theme.space.md}
          backgroundColor={theme.surface}
          borderTopWidth={1}
          borderTopColor={theme.border}
          flexDirection="row"
          justifyContent="space-around"
        >
          <Pressable
            onPress={() => setShowExit(false)}
            hitSlop={8}
            accessibilityLabel="Stay in dashboard"
          >
            <Text
              color={theme.text.muted}
              fontSize={theme.type.body.size}
              fontWeight="600"
            >
              Stay
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setShowExit(false);
              onExit();
            }}
            hitSlop={8}
            accessibilityLabel="Exit to controls"
          >
            <Text
              color={theme.accent}
              fontSize={theme.type.body.size}
              fontWeight="700"
            >
              Show controls
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
