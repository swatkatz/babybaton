import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ActivityType } from '../types/__generated__/graphql';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import type { FilterType } from '../utils/historyGrouping';

interface FilterChipsProps {
  selected: FilterType;
  onSelect: (filter: FilterType) => void;
}

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Feed', value: ActivityType.Feed },
  { label: 'Diaper', value: ActivityType.Diaper },
  { label: 'Sleep', value: ActivityType.Sleep },
];

export function FilterChips({ selected, onSelect }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTERS.map((filter) => {
        const isSelected = selected === filter.value;
        return (
          <TouchableOpacity
            key={filter.value}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(filter.value)}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {filter.label}
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
    backgroundColor: colors.surface,
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
    color: colors.surface,
  },
});
