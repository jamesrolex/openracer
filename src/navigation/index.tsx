/**
 * Root navigator. A native stack:
 *
 *   Home → MarkLibrary → MarkEdit
 *        → CourseEntry → MarkEdit
 *
 * Weeks 2-3 scope. Race timer and settings stacks append here in later
 * weeks.
 */

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CommitteeIdentityScreen } from '../screens/CommitteeIdentityScreen';
import { CourseEntryScreen } from '../screens/CourseEntryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MarkEditScreen } from '../screens/MarkEditScreen';
import { MarkLibraryScreen } from '../screens/MarkLibraryScreen';
import { ScanCoursePushScreen } from '../screens/ScanCoursePushScreen';
import { ShareCourseScreen } from '../screens/ShareCourseScreen';
import { TrustedCommitteesScreen } from '../screens/TrustedCommitteesScreen';

export type RootStackParamList = {
  Home: undefined;
  MarkLibrary: undefined;
  /** `markId` present = edit; absent = create new. */
  MarkEdit: { markId?: string };
  CourseEntry: undefined;
  CommitteeIdentity: undefined;
  ShareCourse: undefined;
  ScanCoursePush: undefined;
  TrustedCommittees: undefined;
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
      <Stack.Screen name="CourseEntry" component={CourseEntryScreen} />
      <Stack.Screen name="CommitteeIdentity" component={CommitteeIdentityScreen} />
      <Stack.Screen name="ShareCourse" component={ShareCourseScreen} />
      <Stack.Screen name="ScanCoursePush" component={ScanCoursePushScreen} />
      <Stack.Screen name="TrustedCommittees" component={TrustedCommitteesScreen} />
    </Stack.Navigator>
  );
}
