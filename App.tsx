import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider } from 'tamagui';

import { DevPanel } from './src/components/DevPanel';
import { useLiveTelemetry } from './src/hooks/useLiveTelemetry';
import { HomeScreen } from './src/screens/HomeScreen';
import { useSettingsStore } from './src/stores/useSettingsStore';
import tamaguiConfig from './tamagui.config';

export default function App() {
  const nightMode = useSettingsStore((state) => state.nightMode);
  useLiveTelemetry();
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={nightMode ? 'night' : 'day'}>
      <HomeScreen />
      {__DEV__ ? <DevPanel /> : null}
      <StatusBar style={nightMode ? 'light' : 'dark'} />
    </TamaguiProvider>
  );
}
