import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';

interface GoalAdherenceBarProps {
  label: string;
  percentage: number | null;
}

function getBarColor(percentage: number): string {
  if (percentage >= 80) return colors.success;
  if (percentage >= 50) return colors.warning;
  return colors.error;
}

export function GoalAdherenceBar({ label, percentage }: GoalAdherenceBarProps) {
  if (percentage === null) {
    return null;
  }

  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const barColor = getBarColor(clampedPercentage);

  return (
    <View style={styles.container} testID="goal-adherence-bar">
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.percentage}>{Math.round(clampedPercentage)}%</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${clampedPercentage}%`, backgroundColor: barColor },
          ]}
          testID="goal-adherence-fill"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: typography.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  percentage: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  track: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: layout.radiusRound,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: layout.radiusRound,
  },
});
