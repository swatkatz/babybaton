import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client/react';
import { StackScreenProps } from '@react-navigation/stack';
import { TimeRangeChips, TimeRange } from '../components/TimeRangeChips';
import { TrendChart } from '../components/TrendChart';
import { HourlyPatternChart } from '../components/HourlyPatternChart';
import { GoalAdherenceBar } from '../components/GoalAdherenceBar';
import { TypeBreakdownBar } from '../components/TypeBreakdownBar';
import {
  GetCareReportDocument,
  ReportGranularity,
  ReportTotals,
  GoalAdherence,
} from '../types/__generated__/graphql';
import { ReportsStackParamList } from '../navigation/MainTabNavigator';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';

type Props = StackScreenProps<ReportsStackParamList, 'ReportDetail'>;

type ActivityType = 'FEED' | 'DIAPER' | 'SLEEP';

const headerConfig: Record<ActivityType, { icon: string; title: string }> = {
  FEED: { icon: '\uD83C\uDF7C', title: 'Feeding Report' },
  DIAPER: { icon: '\uD83D\uDCA9', title: 'Diaper Report' },
  SLEEP: { icon: '\uD83D\uDE34', title: 'Sleep Report' },
};

const metricMap: Record<ActivityType, { metric: 'feeds' | 'diapers' | 'sleepMinutes'; color: string }> = {
  FEED: { metric: 'feeds', color: colors.feed },
  DIAPER: { metric: 'diapers', color: colors.diaper },
  SLEEP: { metric: 'sleepMinutes', color: colors.sleep },
};

const goalMap: Record<string, { label: string; field: keyof GoalAdherence }> = {
  FEED: { label: 'Feed Interval', field: 'feedIntervalAdherencePct' },
};

function getDateRange(range: TimeRange): { from: Date; to: Date; granularity: ReportGranularity } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

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

function formatAdherenceMinutes(minutes: number | null | undefined): number | null {
  if (minutes == null) return null;
  const maxMinutes = 120;
  return Math.max(0, Math.round((1 - minutes / maxMinutes) * 100));
}

function getOvernightStats(totals: ReportTotals): Array<{ value: string; label: string }> {
  const os = totals.overnightStats;
  return [
    { value: formatSleepHours(os.totalMinutes), label: 'total overnight' },
    { value: formatSleepHours(os.medianMinutesPerNight), label: 'median/night' },
    { value: os.medianBedtime ?? '--', label: 'median bedtime' },
    { value: os.medianWakeTime ?? '--', label: 'median wake' },
  ];
}

function getNapSectionStats(totals: ReportTotals): Array<{ value: string; label: string }> {
  const ns = totals.napStats;
  return [
    { value: String(ns.count), label: 'total naps' },
    { value: ns.medianNapsPerDay.toFixed(1), label: 'median/day' },
    { value: formatSleepHours(ns.medianNapDurationMinutes), label: 'median duration' },
  ];
}

function getDetailStats(activityType: ActivityType, totals: ReportTotals): Array<{ value: string; label: string }> {
  switch (activityType) {
    case 'FEED':
      return [
        { value: String(totals.totalFeeds), label: 'total feeds' },
        { value: totals.medianFeedsPerDay.toFixed(1), label: 'median/day' },
        { value: totals.medianMlPerDay.toFixed(0), label: 'median ml/day' },
      ];
    case 'SLEEP':
      return [
        { value: formatSleepHours(totals.totalSleepMinutes), label: 'total sleep' },
        { value: formatSleepHours(totals.medianSleepMinutesPerDay), label: 'median/day' },
        { value: formatSleepHours(totals.medianLongestStretchMinutes), label: 'median stretch' },
      ];
    case 'DIAPER':
      return [
        { value: String(totals.totalDiaperChanges), label: 'total changes' },
        { value: String(totals.totalPoops), label: 'poops' },
        { value: String(totals.totalPees), label: 'pees' },
      ];
  }
}

export function ReportDetailScreen({ route, navigation }: Props) {
  const { activityType } = route.params;
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const { from, to, granularity } = getDateRange(timeRange);

  useEffect(() => {
    const config = headerConfig[activityType];
    navigation.setOptions({ title: `${config.icon} ${config.title}` });
  }, [activityType, navigation]);

  const { data, loading, error } = useQuery(GetCareReportDocument, {
    variables: { from: from.toISOString(), to: to.toISOString(), granularity },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load report</Text>
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
  const stats = getDetailStats(activityType, totals);
  const { metric, color } = metricMap[activityType];
  const goal = goalMap[activityType];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TimeRangeChips selected={timeRange} onSelect={setTimeRange} />

        <View style={styles.cardsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {activityType === 'FEED' && totals.feedTypeBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Feed Type Breakdown</Text>
            <TypeBreakdownBar
              breakdown={totals.feedTypeBreakdown}
              totalFeeds={totals.totalFeeds}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trends</Text>
          <TrendChart buckets={report.buckets} metric={metric} color={color} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Pattern</Text>
          <HourlyPatternChart hourlyPattern={report.hourlyPattern} activityType={activityType} />
        </View>

        {activityType === 'SLEEP' && (
          <>
            <View style={styles.section} testID="overnight-section">
              <Text style={styles.sectionTitle}>Overnight</Text>
              <View style={styles.cardsRow}>
                {getOvernightStats(totals).map((stat) => (
                  <View key={stat.label} style={styles.statCard}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
              {report.goalAdherence && (report.goalAdherence.bedtimeAdherenceMinutesAvg != null || report.goalAdherence.wakeTimeAdherenceMinutesAvg != null) && (
                <View style={styles.goalGroup} testID="overnight-goals">
                  {report.goalAdherence.bedtimeAdherenceMinutesAvg != null && (
                    <GoalAdherenceBar
                      label="Bedtime"
                      percentage={formatAdherenceMinutes(report.goalAdherence.bedtimeAdherenceMinutesAvg)}
                    />
                  )}
                  {report.goalAdherence.wakeTimeAdherenceMinutesAvg != null && (
                    <GoalAdherenceBar
                      label="Wake Time"
                      percentage={formatAdherenceMinutes(report.goalAdherence.wakeTimeAdherenceMinutesAvg)}
                    />
                  )}
                </View>
              )}
            </View>

            <View style={styles.section} testID="naps-section">
              <Text style={styles.sectionTitle}>Naps</Text>
              <View style={styles.cardsRow}>
                {getNapSectionStats(totals).map((stat) => (
                  <View key={stat.label} style={styles.statCard}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
              {report.goalAdherence && report.goalAdherence.napCountAdherencePct != null && (
                <View style={styles.goalGroup} testID="nap-goals">
                  <GoalAdherenceBar
                    label="Nap Count"
                    percentage={report.goalAdherence.napCountAdherencePct}
                  />
                </View>
              )}
            </View>
          </>
        )}

        {goal && report.goalAdherence && (
          <View style={styles.section} testID="goal-adherence-section">
            <Text style={styles.sectionTitle}>Goal Adherence</Text>
            <GoalAdherenceBar
              label={goal.label}
              percentage={report.goalAdherence[goal.field] as number | null}
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
  errorText: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.error,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginTop: 4,
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
  goalGroup: {
    marginTop: spacing.xs,
  },
});
