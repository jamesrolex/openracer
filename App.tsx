import { StatusBar } from 'expo-status-bar';

import { DevPanel } from './src/components/DevPanel';
import { useLiveTelemetry } from './src/hooks/useLiveTelemetry';
import { HomeScreen } from './src/screens/HomeScreen';
import { useSettingsStore } from './src/stores/useSettingsStore';

export default function App() {
  const nightMode = useSettingsStore((state) => state.nightMode);
  useLiveTelemetry();
  return (
    <>
      <HomeScreen />
      {__DEV__ ? <DevPanel /> : null}
      <StatusBar style={nightMode ? 'light' : 'dark'} />
    </>
  );
}
