/**
 * CourseLibraryScreen — your saved courses, ready to re-arm.
 *
 * Lists every persisted course OTHER than the current draft. Tap to
 * "re-arm": clone into a fresh draft (with marks, or stripped of
 * marks for a "use as template" path). Swipe-to-delete. Inline rename
 * via long-press → prompt.
 *
 * Most clubs run the same Wednesday W-L week after week; this is the
 * single biggest UX win for repeat use.
 */

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Text, View } from 'tamagui';

import { COURSE_TEMPLATES } from '../domain/courseTemplates';
import type { RootStackScreenProps } from '../navigation';
import { useCoursesStore } from '../stores/useCoursesStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getTheme } from '../theme/theme';
import type { Course } from '../types/course';

const STATE_LABEL: Record<string, string> = {
  draft: 'DRAFT',
  armed: 'ARMED',
  racing: 'RACING',
  completed: 'DONE',
  archived: 'SAVED',
};

function templateName(id: string): string {
  return COURSE_TEMPLATES.find((t) => t.id === id)?.name ?? id;
}

function formatStartType(s: Course['startType']): string {
  if (s === 'standard-line') return 'Standard line';
  if (s === 'rabbit') return 'Rabbit';
  return 'Gate';
}

function formatLastUsed(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function CourseLibraryScreen({ navigation }: RootStackScreenProps<'CourseLibrary'>) {
  const themeVariant = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeVariant);

  const recent = useCoursesStore((s) => s.recent);
  const activeDraft = useCoursesStore((s) => s.activeDraft);
  const refresh = useCoursesStore((s) => s.refresh);
  const cloneAsDraft = useCoursesStore((s) => s.cloneAsDraft);
  const removeCourse = useCoursesStore((s) => s.removeCourse);
  const renameCourse = useCoursesStore((s) => s.renameCourse);

  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const list = useMemo(() => {
    // Hide the currently-active draft so we don't offer to clone it
    // back over itself.
    const filtered = recent.filter((c) => c.id !== activeDraft?.id);
    if (query.trim().length === 0) return filtered;
    const q = query.trim().toLowerCase();
    return filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        templateName(c.templateId).toLowerCase().includes(q),
    );
  }, [recent, activeDraft, query]);

  function handleTap(course: Course) {
    Alert.alert(
      `Re-arm "${course.name}"?`,
      'Use the same course (with the marks already chosen), or use it as a blank template (you pick fresh marks).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use as template',
          onPress: () => void doClone(course.id, false),
        },
        {
          text: 'Use as-is',
          onPress: () => void doClone(course.id, true),
        },
      ],
    );
  }

  async function doClone(id: string, keepMarks: boolean) {
    setBusy(true);
    try {
      await cloneAsDraft(id, { keepMarks });
      navigation.navigate('CourseEntry');
    } catch (err) {
      Alert.alert(
        'Could not load course',
        err instanceof Error ? err.message : 'Try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  function handleRename(course: Course) {
    Alert.prompt(
      'Rename course',
      'New name for this saved course.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (text: string | undefined) => {
            const trimmed = (text ?? '').trim();
            if (!trimmed) return;
            void renameCourse(course.id, trimmed);
          },
        },
      ],
      'plain-text',
      course.name,
    );
  }

  function handleDelete(course: Course) {
    Alert.alert(
      'Delete saved course?',
      `"${course.name}" will be removed. Race history and tracks are not affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void removeCourse(course.id),
        },
      ],
    );
  }

  function renderItem({ item }: { item: Course }) {
    const subtitle = `${templateName(item.templateId)} · ${formatStartType(
      item.startType,
    )} · ${item.legs.length} legs`;
    const stateLabel = STATE_LABEL[item.state] ?? item.state.toUpperCase();
    return (
      <Swipeable
        renderRightActions={() => (
          <Pressable onPress={() => handleDelete(item)} accessibilityLabel="Delete">
            <View
              justifyContent="center"
              alignItems="center"
              paddingHorizontal={theme.space.lg}
              marginBottom={theme.space.sm}
              backgroundColor={theme.status.danger}
              borderRadius={theme.radius.lg}
            >
              <Text color={theme.bg} fontWeight="700" fontSize={theme.type.body.size}>
                Delete
              </Text>
            </View>
          </Pressable>
        )}
        overshootRight={false}
      >
        <Pressable
          onPress={() => handleTap(item)}
          onLongPress={() => handleRename(item)}
          accessibilityLabel={`Re-arm ${item.name}`}
        >
          <View
            padding={theme.space.md}
            marginBottom={theme.space.sm}
            borderRadius={theme.radius.lg}
            borderWidth={1}
            borderColor={theme.border}
            backgroundColor={theme.surface}
          >
            <View flexDirection="row" justifyContent="space-between" alignItems="center">
              <Text
                color={theme.text.primary}
                fontSize={theme.type.bodySemi.size}
                fontWeight={theme.type.bodySemi.weight as '600'}
                flex={1}
                marginRight={theme.space.sm}
              >
                {item.name}
              </Text>
              <Text
                color={theme.text.muted}
                fontSize={theme.type.micro.size}
                fontWeight={theme.type.micro.weight as '600'}
                letterSpacing={theme.type.micro.letterSpacing}
              >
                {stateLabel}
              </Text>
            </View>
            <Text
              color={theme.text.secondary}
              fontSize={theme.type.caption.size}
              marginTop={theme.space.xxs}
            >
              {subtitle}
            </Text>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.caption.size}
              marginTop={2}
            >
              Last edited {formatLastUsed(item.updatedAt)}
            </Text>
          </View>
        </Pressable>
      </Swipeable>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <View flex={1} paddingHorizontal={theme.space.md} paddingTop={theme.space.sm}>
        <View
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          marginBottom={theme.space.md}
        >
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Text
              color={theme.accent}
              fontSize={theme.type.body.size}
              fontWeight={theme.type.bodySemi.weight as '600'}
            >
              ← Back
            </Text>
          </Pressable>
          <Text
            color={theme.text.primary}
            fontSize={theme.type.h2.size}
            fontWeight={theme.type.h2.weight as '600'}
          >
            Saved courses
          </Text>
          <View width={44} />
        </View>

        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or template…"
          height={44}
          paddingHorizontal={theme.space.md}
          fontSize={theme.type.body.size}
          borderColor={theme.border}
          backgroundColor={theme.surface}
          color={theme.text.primary}
          placeholderTextColor={theme.text.muted}
          marginBottom={theme.space.sm}
        />

        {busy ? (
          <View flex={1} alignItems="center" justifyContent="center">
            <ActivityIndicator color={theme.text.muted} />
            <Text color={theme.text.muted} marginTop={theme.space.sm}>
              Loading…
            </Text>
          </View>
        ) : list.length === 0 ? (
          <View flex={1} alignItems="center" justifyContent="center" padding={theme.space.lg}>
            <Text
              color={theme.text.muted}
              fontSize={theme.type.body.size}
              lineHeight={theme.type.body.lineHeight}
              textAlign="center"
            >
              {recent.length === 0
                ? 'No saved courses yet. Build a course in Course Entry and arm it — it becomes saved automatically.'
                : 'No courses match that search.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(c) => c.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: theme.space.xl }}
          />
        )}

        <Text
          color={theme.text.muted}
          fontSize={theme.type.caption.size}
          textAlign="center"
          marginVertical={theme.space.sm}
        >
          Long-press to rename · swipe left to delete
        </Text>
      </View>
    </SafeAreaView>
  );
}
