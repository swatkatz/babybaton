import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGetCurrentSessionQuery } from '../generated/graphql';
import { colors, getCaregiverColor } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import { ActivityItem } from '../components/ActivityItem';
import { formatDuration, formatTime } from '../utils/time';

type Props = StackScreenProps<RootStackParamList, 'CurrentSessionDetail'>;

export function CurrentSessionDetailScreen({ route }: Props) {
  const { data, loading, error } = useGetCurrentSessionQuery();

  const handleDeleteActivity = (activityId: string) => {
    console.log('Delete activity:', activityId);
    // TODO: Implement delete mutation
  };

  const handleMarkAsAwake = () => {
    console.log('Mark baby as awake');
    // TODO: Implement mark as awake mutation
  };

  const handleCompleteSession = () => {
    console.log('Complete session');
    // TODO: Implement complete session mutation
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading session...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
      </View>
    );
  }

  const session = data?.getCurrentSession;

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No active session</Text>
      </View>
    );
  }

  const caregiverColor = getCaregiverColor(session.caregiver.id);
  const duration = formatDuration(new Date(session.startedAt));

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

        <View style={styles.sessionInfo}>
          <Text style={styles.label}>Started</Text>
          <Text style={styles.timeText}>
            {formatTime(new Date(session.startedAt))}
          </Text>
          <Text style={styles.durationText}>Duration: {duration}</Text>
        </View>

        {/* Mark as Awake Button (if baby is currently sleeping) */}
        {session.summary.currentlyAsleep && (
          <TouchableOpacity
            style={styles.awakeButton}
            onPress={handleMarkAsAwake}
          >
            <Text style={styles.awakeButtonText}>👁️ Mark as Awake</Text>
          </TouchableOpacity>
        )}

        {/* Activities */}
        <Text style={styles.sectionTitle}>
          Activities ({session.activities.length}):
        </Text>

        {session.activities.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No activities recorded yet
            </Text>
          </View>
        ) : (
          <View style={styles.activitiesList}>
            {session.activities.map((activity) => (
              <View key={activity.id} style={styles.activityRow}>
                <View style={styles.activityContent}>
                  <ActivityItem activity={activity} />
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteActivity(activity.id)}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

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
          {session.summary.currentlyAsleep && (
            <Text style={[styles.summaryText, styles.sleepingText]}>
              • Currently sleeping 💤
            </Text>
          )}
        </View>

        {session.notes && (
          <View style={styles.notes}>
            <Text style={styles.sectionTitle}>Notes:</Text>
            <Text style={styles.notesText}>{session.notes}</Text>
          </View>
        )}

        {/* Complete Session Button */}
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleCompleteSession}
        >
          <Text style={styles.completeButtonText}>✓ Complete Session</Text>
        </TouchableOpacity>
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
  loadingText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  errorText: {
    fontSize: typography.base,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  caregiverBadge: {
    alignSelf: 'flex-start',
    borderRadius: layout.radiusSmall,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  caregiverText: {
    fontSize: typography.sm,
    fontWeight: '600',
  },
  sessionInfo: {
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  timeText: {
    fontSize: typography.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  durationText: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  awakeButton: {
    backgroundColor: colors.warning,
    borderRadius: layout.radiusMedium,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  awakeButtonText: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.surface,
  },
  sectionTitle: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyStateText: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  activitiesList: {
    gap: spacing.sm,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activityContent: {
    flex: 1,
  },
  deleteButton: {
    backgroundColor: colors.error,
    borderRadius: layout.radiusSmall,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 20,
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
  sleepingText: {
    color: colors.sleep,
    fontWeight: '600',
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
  completeButton: {
    backgroundColor: colors.success,
    borderRadius: layout.radiusMedium,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.surface,
  },
});
