import { StatusBar } from 'expo-status-bar';

import { HomeScreen } from './src/screens/HomeScreen';
import { useSettingsStore } from './src/stores/useSettingsStore';

export default function App() {
  const nightMode = useSettingsStore((state) => state.nightMode);
  return (
    <>
      <HomeScreen />
      <StatusBar style={nightMode ? 'light' : 'dark'} />
    </>
  );
}
