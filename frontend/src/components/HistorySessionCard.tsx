import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, getCaregiverColor } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import { formatDuration, formatTime } from '../utils/time';
import { ActivityItem } from './ActivityItem';
import type { SessionLike } from '../utils/historyGrouping';

interface HistorySessionCardProps {
  session: SessionLike;
  onPress: () => void;
  onActivityPress?: (activityId: string) => void;
}

export function HistorySessionCard({
  session,
  onPress,
  onActivityPress,
}: HistorySessionCardProps) {
  const caregiverColor = getCaregiverColor(session.caregiver.id);
  const duration = session.completedAt
    ? formatDuration(new Date(session.startedAt), new Date(session.completedAt))
    : '';

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onPress} style={styles.header} testID="session-header">
        <View style={styles.headerLeft}>
          <View
            style={[styles.caregiverBadge, { backgroundColor: caregiverColor.bg }]}
          >
            <Text style={[styles.caregiverText, { color: caregiverColor.text }]}>
              {session.caregiver.name}
            </Text>
          </View>
          <Text style={styles.timeText}>
            {formatTime(new Date(session.startedAt))}
            {session.completedAt && ` - ${formatTime(new Date(session.completedAt))}`}
            {duration ? ` · ${duration}` : ''}
          </Text>
        </View>
        <ChevronRight size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {session.activities.length > 0 && (
        <View style={styles.activitiesContainer}>
          {session.activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              onEdit={
                onActivityPress
                  ? () => onActivityPress(activity.id)
                  : undefined
              }
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  caregiverBadge: {
    alignSelf: 'flex-start',
    borderRadius: layout.radiusSmall,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  caregiverText: {
    fontSize: typography.sm,
    fontWeight: '600',
  },
  timeText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  activitiesContainer: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
