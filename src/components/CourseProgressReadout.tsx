/**
 * CourseProgressReadout — the "how much of the course have we sailed"
 * strip shown during an active race. Reads the in-memory sailedMetres
 * counter from useRaceStore (cheap to pull every frame) and the
 * totalMetres of the armed course (computed once per render from the
 * course draft + marks).
 *
 * When the course is unfilled (start-only arming) we show distance
 * sailed without a total or percentage.
 */

import { Text, View } from 'tamagui';

import { metresToNm, progressPercent } from '../domain/courseDistance';
import { getTheme } from '../theme/theme';

interface Props {
  sailedMetres: number;
  totalMetres: number;
  variant: 'day' | 'night' | 'kindle';
}

export function CourseProgressReadout({
  sailedMetres,
  totalMetres,
  variant,
}: Props) {
  const theme = getTheme(variant);
  const sailedNm = metresToNm(sailedMetres);
  const totalNm = metresToNm(totalMetres);
  const pct = progressPercent(sailedMetres, totalMetres);
  const hasCourse = totalMetres > 0;

  return (
    <View
      padding={theme.space.sm}
      borderRadius={theme.radius.md}
      borderColor={theme.border}
      borderWidth={1}
      backgroundColor={theme.surface}
      marginBottom={theme.space.sm}
    >
      <View
        flexDirection="row"
        justifyContent="space-between"
        alignItems="baseline"
        marginBottom={theme.space.xs}
      >
        <Text
          color={theme.text.muted}
          fontSize={theme.type.micro.size}
          fontWeight={theme.type.micro.weight as '600'}
          letterSpacing={theme.type.micro.letterSpacing}
        >
          COURSE PROGRESS
        </Text>
        {hasCourse ? (
          <Text
            color={theme.text.secondary}
            fontSize={theme.type.caption.size}
            fontWeight={theme.type.bodySemi.weight as '600'}
          >
            {Math.round(pct)}%
          </Text>
        ) : null}
      </View>

      <Text
        color={theme.text.primary}
        fontSize={theme.type.h2.size}
        fontWeight={theme.type.h2.weight as '600'}
        style={{ fontFamily: 'Menlo' }}
      >
        {sailedNm.toFixed(2)} nm
        {hasCourse ? (
          <Text
            color={theme.text.muted}
            fontSize={theme.type.body.size}
            fontWeight={theme.type.body.weight as '400'}
          >
            {' '}
            of {totalNm.toFixed(2)} nm
          </Text>
        ) : null}
      </Text>

      {hasCourse ? (
        <View
          height={6}
          borderRadius={3}
          backgroundColor={theme.border}
          marginTop={theme.space.xs}
          overflow="hidden"
        >
          <View
            height={6}
            width={`${pct}%`}
            backgroundColor={pct >= 100 ? theme.status.success : theme.accent}
          />
        </View>
      ) : null}
    </View>
  );
}
