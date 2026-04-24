/**
 * OnboardingScreen — first-launch welcome. Rendered above RootNavigator
 * until `onboardingCompleted` flips true. Three short cards: what this
 * is, what the app needs, where to start. The iOS/Android GPS permission
 * dialog appears on top of this screen the first time (triggered by
 * useLiveTelemetry) — that is fine and acts as the permission prompt.
 */

import { Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';

import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';

const CARDS: { title: string; body: string }[] = [
  {
    title: 'Welcome aboard',
    body: 'OpenRacer is a racing and navigation tool for club sailors. Works offline — built for signal-dead places like Abersoch.',
  },
  {
    title: 'Location access',
    body: 'The app needs GPS to show your boat on the water. Tap "Allow" when iOS or Android asks. No network is needed — GPS is satellite-based.',
  },
  {
    title: 'Your library is seeded',
    body: 'Abersoch YC marks are preloaded. Tap "Build course" on the home screen, pick a template (W-L, triangle), and select marks. Arm the timer and you’re off.',
  },
];

export function OnboardingScreen() {
  const nightMode = useSettingsStore((s) => s.nightMode);
  const complete = useSettingsStore((s) => s.completeOnboarding);
  const theme = getTheme(nightMode ? 'night' : 'day');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.space.lg,
          paddingTop: theme.space.xl,
          paddingBottom: theme.space.xl,
          flexGrow: 1,
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text
            color={theme.accent}
            fontSize={theme.type.h1.size}
            fontWeight={theme.type.h1.weight as '700'}
            lineHeight={theme.type.h1.lineHeight}
            marginBottom={theme.space.lg}
          >
            OpenRacer
          </Text>

          {CARDS.map((card) => (
            <View
              key={card.title}
              padding={theme.space.md}
              borderRadius={theme.radius.lg}
              borderColor={theme.border}
              borderWidth={1}
              backgroundColor={theme.surface}
              marginBottom={theme.space.md}
            >
              <Text
                color={theme.text.primary}
                fontSize={theme.type.h2.size}
                fontWeight={theme.type.h2.weight as '600'}
                lineHeight={theme.type.h2.lineHeight}
                marginBottom={theme.space.xs}
              >
                {card.title}
              </Text>
              <Text
                color={theme.text.secondary}
                fontSize={theme.type.body.size}
                lineHeight={theme.type.body.lineHeight}
              >
                {card.body}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={complete}
          accessibilityLabel="Get started"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, marginTop: theme.space.lg })}
        >
          <View
            minHeight={52}
            paddingVertical={theme.space.sm}
            paddingHorizontal={theme.space.lg}
            borderRadius={theme.radius.full}
            backgroundColor={theme.accent}
            alignItems="center"
            justifyContent="center"
          >
            <Text
              color={theme.bg}
              fontSize={theme.type.bodySemi.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
              lineHeight={theme.type.bodySemi.lineHeight}
            >
              Get started
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
