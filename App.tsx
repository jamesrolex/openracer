import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from 'tamagui';

import { DevPanel } from './src/components/DevPanel';
import { installForegroundHandler } from './src/domain/raceNotifications';
import { useCruiseTrackLogger } from './src/hooks/useCruiseTrackLogger';
import { useLiveTelemetry } from './src/hooks/useLiveTelemetry';
import { useRaceTrackLogger } from './src/hooks/useRaceTrackLogger';
import { useTripLogger } from './src/hooks/useTripLogger';
import { RootNavigator } from './src/navigation';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { seedMarksIfEmpty } from './src/stores/marksSeed';
import { useCoursesStore } from './src/stores/useCoursesStore';
import { useMarksStore } from './src/stores/useMarksStore';
import { useSettingsStore } from './src/stores/useSettingsStore';
import tamaguiConfig from './tamagui.config';

export default function App() {
  const themeVariant = useSettingsStore((state) => state.theme);
  const onboardingCompleted = useSettingsStore((state) => state.onboardingCompleted);
  const refreshMarks = useMarksStore((s) => s.refresh);
  const hydrateCourses = useCoursesStore((s) => s.hydrate);
  useLiveTelemetry();
  useRaceTrackLogger();
  useTripLogger();
  useCruiseTrackLogger();

  useEffect(() => {
    installForegroundHandler();
    void (async () => {
      await seedMarksIfEmpty();
      await refreshMarks();
      await hydrateCourses();
    })();
  }, [refreshMarks, hydrateCourses]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider
          config={tamaguiConfig}
          defaultTheme={themeVariant === 'night' ? 'night' : 'day'}
        >
          {onboardingCompleted ? (
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          ) : (
            <OnboardingScreen />
          )}
          {__DEV__ ? <DevPanel /> : null}
          <StatusBar style={themeVariant === 'night' ? 'light' : 'dark'} />
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
