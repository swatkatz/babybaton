import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FeedType, FeedTypeCount } from '../types/__generated__/graphql';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';

interface TypeBreakdownBarProps {
  breakdown: FeedTypeCount[];
  totalFeeds: number;
}

const FEED_TYPE_COLORS: Record<FeedType, string> = {
  [FeedType.BreastMilk]: colors.primary,
  [FeedType.Formula]: colors.primaryLight,
  [FeedType.Solids]: colors.accent,
};

const FEED_TYPE_LABELS: Record<FeedType, string> = {
  [FeedType.BreastMilk]: 'Breast Milk',
  [FeedType.Formula]: 'Formula',
  [FeedType.Solids]: 'Solids',
};

export function TypeBreakdownBar({ breakdown, totalFeeds }: TypeBreakdownBarProps) {
  if (totalFeeds === 0 || breakdown.length === 0) {
    return null;
  }

  // Filter out segments < 1% of total
  const visibleSegments = breakdown.filter(
    (item) => item.count / totalFeeds >= 0.01
  );

  if (visibleSegments.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID="type-breakdown-bar">
      <View style={styles.bar}>
        {visibleSegments.map((item) => {
          const proportion = item.count / totalFeeds;
          const isWide = proportion >= 0.15;
          return (
            <View
              key={item.feedType}
              style={[
                styles.segment,
                {
                  flex: proportion,
                  backgroundColor: FEED_TYPE_COLORS[item.feedType],
                },
              ]}
              testID={`segment-${item.feedType}`}
            >
              {isWide && (
                <Text style={styles.segmentLabel}>
                  {FEED_TYPE_LABELS[item.feedType]}
                </Text>
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        {visibleSegments.map((item) => {
          const proportion = item.count / totalFeeds;
          return (
            <View key={item.feedType} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: FEED_TYPE_COLORS[item.feedType] },
                ]}
              />
              <Text style={styles.legendText}>
                {FEED_TYPE_LABELS[item.feedType]} ({Math.round(proportion * 100)}%)
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
  },
  bar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: layout.radiusSmall,
    overflow: 'hidden',
  },
  segment: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
});
