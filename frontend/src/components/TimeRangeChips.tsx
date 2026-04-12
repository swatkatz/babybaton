import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';

export type TimeRange = 'day' | 'week' | 'month' | 'year';

interface TimeRangeChipsProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

const RANGES: { label: string; value: TimeRange }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

export function TimeRangeChips({ selected, onSelect }: TimeRangeChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {RANGES.map((range) => {
        const isSelected = selected === range.value;
        return (
          <TouchableOpacity
            key={range.value}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(range.value)}
            testID={`range-chip-${range.value}`}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {range.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: layout.radiusRound,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});
