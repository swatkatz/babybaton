import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/spacing';
import { formatMinutesToDuration } from '../utils/time';

interface DayHeaderProps {
  label: string;
  feedCount: number;
  totalMl: number;
  diaperPoop: number;
  diaperPee: number;
  totalSleepMinutes: number;
}

export function DayHeader({
  label,
  feedCount,
  totalMl,
  diaperPoop,
  diaperPee,
  totalSleepMinutes,
}: DayHeaderProps) {
  const hasDiapers = diaperPoop > 0 || diaperPee > 0;
  const hasSleep = totalSleepMinutes > 0;

  const statParts: string[] = [];

  // Feed stats
  statParts.push(`${feedCount} ${feedCount === 1 ? 'feed' : 'feeds'} · ${totalMl}ml`);

  // Diaper stats
  if (hasDiapers) {
    const diaperParts: string[] = [];
    if (diaperPoop > 0) diaperParts.push(`${diaperPoop}\uD83D\uDCA9`);
    if (diaperPee > 0) diaperParts.push(`${diaperPee}\uD83D\uDCA7`);
    statParts.push(diaperParts.join(' '));
  }

  // Sleep stats
  if (hasSleep) {
    statParts.push(`${formatMinutesToDuration(totalSleepMinutes)}\uD83D\uDE34`);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.stats}>{statParts.join(' | ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.base,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  stats: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
});
