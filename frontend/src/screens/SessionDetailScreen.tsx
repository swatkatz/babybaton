import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGetCareSessionQuery, Activity } from '../generated/graphql';
import { colors, getCaregiverColor } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import { ActivityItem } from '../components/ActivityItem';
import { formatDuration, formatTime } from '../utils/time';

type Props = StackScreenProps<RootStackParamList, 'SessionDetail'>;

export function SessionDetailScreen({ route }: Props) {
  const { sessionId } = route.params;

  const { data, loading, error } = useGetCareSessionQuery({
    variables: { id: sessionId },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading session...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text>Error: {error.message}</Text>
      </View>
    );
  }

  const session = data?.getCareSession;

  if (!session) {
    return (
      <View style={styles.container}>
        <Text>Session not found</Text>
      </View>
    );
  }

  const caregiverColor = getCaregiverColor(session.caregiver.id);
  const duration = formatDuration(
    new Date(session.startedAt),
    session.completedAt ? new Date(session.completedAt) : undefined
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View
          style={[
            styles.caregiverBadge,
            { backgroundColor: caregiverColor.bg },
          ]}
        >
          <Text style={[styles.caregiverText, { color: caregiverColor.text }]}>
            {session.caregiver.name}
          </Text>
        </View>

        <Text style={styles.timeRange}>
          {formatTime(new Date(session.startedAt))} -{' '}
          {session.completedAt && formatTime(new Date(session.completedAt))}
        </Text>
        <Text style={styles.duration}>Duration: {duration}</Text>

        {/* Activities */}
        <Text style={styles.sectionTitle}>
          Activities ({session.activities.length}):
        </Text>
        {session.activities.map((activity: Activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.sectionTitle}>Session Summary:</Text>
          <Text style={styles.summaryText}>
            • Total feeds: {session.summary.totalFeeds} (
            {session.summary.totalMl}ml)
          </Text>
          <Text style={styles.summaryText}>
            • Diaper changes: {session.summary.totalDiaperChanges}
          </Text>
          <Text style={styles.summaryText}>
            • Sleep time: {Math.floor(session.summary.totalSleepMinutes / 60)}h{' '}
            {session.summary.totalSleepMinutes % 60}m
          </Text>
        </View>

        {session.notes && (
          <View style={styles.notes}>
            <Text style={styles.sectionTitle}>Notes:</Text>
            <Text style={styles.notesText}>{session.notes}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  caregiverBadge: {
    alignSelf: 'flex-start',
    borderRadius: layout.radiusSmall,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  caregiverText: {
    fontSize: typography.sm,
    fontWeight: '600',
  },
  timeRange: {
    fontSize: typography.base,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  duration: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  summaryText: {
    fontSize: typography.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  notes: {
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  notesText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
});
