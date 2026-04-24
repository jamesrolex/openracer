/**
 * Root navigator. A minimal native stack:
 *
 *   Home → MarkLibrary → MarkEdit
 *
 * Week 2 scope. Course entry, race timer, and settings stacks append here
 * in later weeks.
 */

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { HomeScreen } from '../screens/HomeScreen';
import { MarkEditScreen } from '../screens/MarkEditScreen';
import { MarkLibraryScreen } from '../screens/MarkLibraryScreen';

export type RootStackParamList = {
  Home: undefined;
  MarkLibrary: undefined;
  /** `markId` present = edit; absent = create new. */
  MarkEdit: { markId?: string };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="MarkLibrary" component={MarkLibraryScreen} />
      <Stack.Screen name="MarkEdit" component={MarkEditScreen} />
    </Stack.Navigator>
  );
}
