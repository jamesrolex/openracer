import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from 'tamagui';

import { DevPanel } from './src/components/DevPanel';
import { useLiveTelemetry } from './src/hooks/useLiveTelemetry';
import { RootNavigator } from './src/navigation';
import { seedMarksIfEmpty } from './src/stores/marksSeed';
import { useCoursesStore } from './src/stores/useCoursesStore';
import { useMarksStore } from './src/stores/useMarksStore';
import { useSettingsStore } from './src/stores/useSettingsStore';
import tamaguiConfig from './tamagui.config';

export default function App() {
  const nightMode = useSettingsStore((state) => state.nightMode);
  const refreshMarks = useMarksStore((s) => s.refresh);
  const hydrateCourses = useCoursesStore((s) => s.hydrate);
  useLiveTelemetry();

  useEffect(() => {
    void (async () => {
      await seedMarksIfEmpty();
      await refreshMarks();
      await hydrateCourses();
    })();
  }, [refreshMarks, hydrateCourses]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme={nightMode ? 'night' : 'day'}>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
          {__DEV__ ? <DevPanel /> : null}
          <StatusBar style={nightMode ? 'light' : 'dark'} />
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
