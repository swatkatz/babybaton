import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { HourlyBucket } from '../types/__generated__/graphql';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/spacing';

type ActivityType = 'FEED' | 'DIAPER' | 'SLEEP';

interface HourlyPatternChartProps {
  hourlyPattern: HourlyBucket[];
  activityType?: ActivityType;
}

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  FEED: colors.feed,
  SLEEP: colors.sleep,
  DIAPER: colors.diaper,
};

function getMetricForType(bucket: HourlyBucket, type: ActivityType): number {
  switch (type) {
    case 'FEED':
      return bucket.feeds;
    case 'SLEEP':
      return bucket.sleepMinutes;
    case 'DIAPER':
      return bucket.diapers;
  }
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12a';
  if (hour === 12) return '12p';
  if (hour < 12) return `${hour}a`;
  return `${hour - 12}p`;
}

export function HourlyPatternChart({ hourlyPattern, activityType }: HourlyPatternChartProps) {
  // Sort by hour and ensure we have all 24 hours
  const sortedBuckets = [...hourlyPattern].sort((a, b) => a.hour - b.hour);

  if (activityType) {
    // Single activity type: one color
    const barData = sortedBuckets.map((bucket) => ({
      value: getMetricForType(bucket, activityType),
      frontColor: ACTIVITY_COLORS[activityType],
      label: bucket.hour % 6 === 0 ? formatHourLabel(bucket.hour) : '',
      labelTextStyle: styles.barLabel,
    }));

    return (
      <View style={styles.container} testID="hourly-chart">
        <BarChart
          data={barData}
          barWidth={8}
          spacing={4}
          noOfSections={4}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.barLabel}
          hideRules={false}
          rulesColor={colors.border}
          isAnimated
        />
      </View>
    );
  }

  // Overview: stacked bars for all types
  const stackData = sortedBuckets.map((bucket) => ({
    stacks: [
      { value: bucket.feeds, color: colors.feed },
      { value: bucket.sleepMinutes, color: colors.sleep },
      { value: bucket.diapers, color: colors.diaper },
    ],
    label: bucket.hour % 6 === 0 ? formatHourLabel(bucket.hour) : '',
    labelTextStyle: styles.barLabel,
  }));

  return (
    <View style={styles.container} testID="hourly-chart">
      <BarChart
        stackData={stackData}
        barWidth={8}
        spacing={4}
        noOfSections={4}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.barLabel}
        hideRules={false}
        rulesColor={colors.border}
        isAnimated
      />
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.feed }]} />
          <Text style={styles.legendText}>Feed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.sleep }]} />
          <Text style={styles.legendText}>Sleep</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.diaper }]} />
          <Text style={styles.legendText}>Diaper</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  barLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  axisText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
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
