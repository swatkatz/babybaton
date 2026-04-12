import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client/react';
import { StackNavigationProp } from '@react-navigation/stack';
import { TimeRangeChips, TimeRange } from '../components/TimeRangeChips';
import { SummaryCard } from '../components/SummaryCard';
import { TrendChart } from '../components/TrendChart';
import { HourlyPatternChart } from '../components/HourlyPatternChart';
import { GoalAdherenceBar } from '../components/GoalAdherenceBar';
import {
  GetCareReportDocument,
  ReportGranularity,
} from '../types/__generated__/graphql';
import { ReportsStackParamList } from '../navigation/MainTabNavigator';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';

type Props = {
  navigation: StackNavigationProp<ReportsStackParamList, 'ReportsOverview'>;
  route: { key: string; name: 'ReportsOverview' };
};

function getDateRange(range: TimeRange): { from: Date; to: Date; granularity: ReportGranularity } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // tomorrow midnight local

  switch (range) {
    case 'day':
      return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate()), to, granularity: ReportGranularity.Day };
    case 'week':
      return { from: new Date(to.getTime() - 7 * 86400000), to, granularity: ReportGranularity.Day };
    case 'month':
      return { from: new Date(to.getTime() - 30 * 86400000), to, granularity: ReportGranularity.Day };
    case 'year':
      return { from: new Date(to.getTime() - 365 * 86400000), to, granularity: ReportGranularity.Month };
  }
}

function formatSleepHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

export function ReportsScreen({ navigation }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const { from, to, granularity } = getDateRange(timeRange);

  const { data, loading, error } = useQuery(GetCareReportDocument, {
    variables: { from: from.toISOString(), to: to.toISOString(), granularity },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load reports</Text>
          <Text style={styles.errorDetail}>{error.message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const report = data?.careReport;
  if (!report) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>No report data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { totals } = report;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TimeRangeChips selected={timeRange} onSelect={setTimeRange} />

        <View style={styles.cardsRow}>
          <View style={styles.cardWrapper}>
            <SummaryCard
              icon={'\uD83C\uDF7C'}
              value={String(totals.totalFeeds)}
              label="feeds"
              subtitle={`median ${totals.medianFeedsPerDay}/day`}
              onPress={() => navigation.navigate('ReportDetail', { activityType: 'FEED' })}
            />
          </View>
          <View style={styles.cardWrapper}>
            <SummaryCard
              icon={'\uD83D\uDCA9'}
              value={String(totals.totalDiaperChanges)}
              label="diapers"
              subtitle={`median ${totals.medianDiapersPerDay}/day`}
              onPress={() => navigation.navigate('ReportDetail', { activityType: 'DIAPER' })}
            />
          </View>
          <View style={styles.cardWrapper}>
            <SummaryCard
              icon={'\uD83D\uDE34'}
              value={formatSleepHours(totals.totalSleepMinutes)}
              label="sleep"
              subtitle={`median ${formatSleepHours(totals.medianSleepMinutesPerDay)}/day`}
              onPress={() => navigation.navigate('ReportDetail', { activityType: 'SLEEP' })}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trends</Text>
          <TrendChart buckets={report.buckets} metric="feeds" color={colors.feed} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Pattern</Text>
          <HourlyPatternChart hourlyPattern={report.hourlyPattern} />
        </View>

        {report.goalAdherence && (
          <View style={styles.section} testID="goal-adherence-section">
            <Text style={styles.sectionTitle}>Goal Adherence</Text>
            <GoalAdherenceBar
              label="Wake Window"
              percentage={report.goalAdherence.wakeWindowAdherencePct}
            />
            <GoalAdherenceBar
              label="Feed Interval"
              percentage={report.goalAdherence.feedIntervalAdherencePct}
            />
            <GoalAdherenceBar
              label="Nap Count"
              percentage={report.goalAdherence.napCountAdherencePct}
            />
            <GoalAdherenceBar
              label="Bedtime"
              percentage={report.goalAdherence.bedtimeAdherenceMinutesAvg}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.error,
    marginBottom: spacing.xs,
  },
  errorDetail: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  cardWrapper: {
    flex: 1,
  },
  section: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    padding: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
});
