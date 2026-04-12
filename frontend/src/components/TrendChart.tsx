import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { ReportBucket } from '../types/__generated__/graphql';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/spacing';

interface TrendChartProps {
  buckets: ReportBucket[];
  metric: 'feeds' | 'ml' | 'diapers' | 'sleepMinutes';
  color: string;
}

function formatBucketLabel(bucketStart: string): string {
  const date = new Date(bucketStart);
  const month = date.toLocaleString('default', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

export function TrendChart({ buckets, metric, color }: TrendChartProps) {
  if (buckets.length === 0) {
    return (
      <View style={styles.emptyContainer} testID="trend-chart-empty">
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const barData = buckets.map((bucket) => ({
    value: bucket[metric],
    frontColor: color,
    label: formatBucketLabel(bucket.bucketStart),
    labelTextStyle: styles.barLabel,
  }));

  return (
    <View style={styles.container} testID="trend-chart">
      <BarChart
        data={barData}
        barWidth={24}
        spacing={12}
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

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  emptyContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  barLabel: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  axisText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
});
