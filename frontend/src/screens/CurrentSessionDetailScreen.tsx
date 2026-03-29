import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client/react';
import { StackScreenProps } from '@react-navigation/stack';
import { HomeStackParamList } from '../navigation/MainTabNavigator';
import {
  GetCurrentSessionDocument,
  CompleteCareSessionDocument,
  DeleteActivityDocument,
  EndActivityDocument,
  UpdateActivityDocument,
  Activity,
  ActivityInput,
} from '../types/__generated__/graphql';
import { colors, getCaregiverColor } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import { ActivityItem } from '../components/ActivityItem';
import { EditActivityModal } from '../components/EditActivityModal';
import { formatDuration, formatTime } from '../utils/time';

type Props = StackScreenProps<HomeStackParamList, 'CurrentSessionDetail'>;

export function CurrentSessionDetailScreen({ navigation }: Props) {
  const { data, loading, error } = useQuery(GetCurrentSessionDocument);
  const [completeCareSession, { loading: completing }] = useMutation(
    CompleteCareSessionDocument,
    {
      refetchQueries: [GetCurrentSessionDocument],
    },
  );
  const [endActivity, { loading: endingActivity }] = useMutation(
    EndActivityDocument,
    {
      refetchQueries: [GetCurrentSessionDocument],
    },
  );
  const [deleteActivity] = useMutation(DeleteActivityDocument, {
    refetchQueries: [GetCurrentSessionDocument],
  });
  const [updateActivity, { loading: updatingActivity }] = useMutation(
    UpdateActivityDocument,
    {
      refetchQueries: [GetCurrentSessionDocument],
    },
  );

  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
  };

  const handleSaveEdit = async (activityId: string, input: ActivityInput) => {
    try {
      await updateActivity({ variables: { activityId, input } });
      setEditingActivity(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to update activity';
      Alert.alert('Error', message);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    try {
      await deleteActivity({ variables: { activityId } });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to delete activity';
      Alert.alert('Error', message);
    }
  };

  const handleMarkAwake = async (activityId: string) => {
    try {
      await endActivity({ variables: { activityId } });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to mark as awake';
      Alert.alert('Error', message);
    }
  };

  const handleCompleteSession = async () => {
    try {
      await completeCareSession();
      navigation.goBack();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to complete session';
      console.error('Failed to complete session:', message);
    }
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
            {session.activities.map((activity: Activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                onDelete={handleDeleteActivity}
                onEdit={handleEditActivity}
                onMarkAwake={handleMarkAwake}
                markAwakeLoading={endingActivity}
              />
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
        <Text style={styles.completeHint}>
          Completing the session passes the baton to the next caregiver.
        </Text>
        <TouchableOpacity
          style={[styles.completeButton, completing && styles.completeButtonDisabled]}
          onPress={handleCompleteSession}
          disabled={completing}
        >
          <Text style={styles.completeButtonText}>
            {completing ? 'Completing...' : 'Complete Session'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <EditActivityModal
        visible={editingActivity !== null}
        activity={editingActivity}
        onClose={() => setEditingActivity(null)}
        onSave={handleSaveEdit}
        saving={updatingActivity}
      />
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
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.surface,
  },
  completeHint: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
});
