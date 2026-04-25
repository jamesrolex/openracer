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
import { CourseLibraryScreen } from '../screens/CourseLibraryScreen';
import { CruiseDisplayScreen } from '../screens/CruiseDisplayScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MarkBearingScreen } from '../screens/MarkBearingScreen';
import { MarkEditScreen } from '../screens/MarkEditScreen';
import { MarkLibraryScreen } from '../screens/MarkLibraryScreen';
import { MarkPointAtScreen } from '../screens/MarkPointAtScreen';
import { RaceSessionScreen } from '../screens/RaceSessionScreen';
import { RaceSessionsScreen } from '../screens/RaceSessionsScreen';
import { RaceTimerScreen } from '../screens/RaceTimerScreen';
import { SailorLogScreen } from '../screens/SailorLogScreen';
import { ScanCoursePushScreen } from '../screens/ScanCoursePushScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ShareBoatProfileScreen } from '../screens/ShareBoatProfileScreen';
import { ShareCourseScreen } from '../screens/ShareCourseScreen';
import { ShareFinishScreen } from '../screens/ShareFinishScreen';
import { ShareRaceScreen } from '../screens/ShareRaceScreen';
import { TrustedCommitteesScreen } from '../screens/TrustedCommitteesScreen';

export type RootStackParamList = {
  Home: undefined;
  MarkLibrary: undefined;
  /** `markId` present = edit; absent = create new. */
  MarkEdit: { markId?: string };
  CourseEntry: undefined;
  CourseLibrary: undefined;
  /** Open the bearing + distance flow; computed mark drops into `legId` on save. */
  MarkBearing: { legId: string };
  /** Point-at-mark triangulation flow; result drops into `legId`. */
  MarkPointAt: { legId: string };
  CommitteeIdentity: undefined;
  ShareCourse: undefined;
  ShareRace: undefined;
  ShareFinish: { sessionId: string };
  ShareBoatProfile: undefined;
  Leaderboard: undefined;
  SailorLog: undefined;
  ScanCoursePush: undefined;
  TrustedCommittees: undefined;
  RaceTimer: undefined;
  CruiseDisplay: undefined;
  RaceSessions: undefined;
  RaceSession: { sessionId: string };
  Settings: undefined;
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
      <Stack.Screen name="CourseLibrary" component={CourseLibraryScreen} />
      <Stack.Screen name="MarkBearing" component={MarkBearingScreen} />
      <Stack.Screen name="MarkPointAt" component={MarkPointAtScreen} />
      <Stack.Screen name="CommitteeIdentity" component={CommitteeIdentityScreen} />
      <Stack.Screen name="ShareCourse" component={ShareCourseScreen} />
      <Stack.Screen name="ShareRace" component={ShareRaceScreen} />
      <Stack.Screen name="ShareFinish" component={ShareFinishScreen} />
      <Stack.Screen name="ShareBoatProfile" component={ShareBoatProfileScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="SailorLog" component={SailorLogScreen} />
      <Stack.Screen name="ScanCoursePush" component={ScanCoursePushScreen} />
      <Stack.Screen name="TrustedCommittees" component={TrustedCommitteesScreen} />
      <Stack.Screen name="RaceTimer" component={RaceTimerScreen} />
      <Stack.Screen name="CruiseDisplay" component={CruiseDisplayScreen} />
      <Stack.Screen name="RaceSessions" component={RaceSessionsScreen} />
      <Stack.Screen name="RaceSession" component={RaceSessionScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
