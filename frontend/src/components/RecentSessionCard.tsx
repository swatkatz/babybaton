import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, getCaregiverColor } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import { GetRecentSessionsQuery } from '../types/__generated__/graphql';
import {
  formatDuration,
  formatMinutesToDuration,
  formatTime,
} from '../utils/time';

/**
 * RecentSessionCard Component
 * Displays a completed care session with summary info (no activity list)
 */

interface RecentSessionCardProps {
  session: NonNullable<GetRecentSessionsQuery['getRecentCareSessions']>[number];
  onPress: () => void;
}

export function RecentSessionCard({
  session,
  onPress,
}: RecentSessionCardProps) {
  const caregiverColor = getCaregiverColor(session.caregiver.id);
  const duration = session.completedAt
    ? formatDuration(new Date(session.startedAt), new Date(session.completedAt))
    : '';
  // Format sleep time using imported function
  const sleepTime = formatMinutesToDuration(session.summary.totalSleepMinutes);

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.card}>
        {/* Header with caregiver and chevron */}
        <View style={styles.header}>
          <View
            style={[
              styles.caregiverBadge,
              { backgroundColor: caregiverColor.bg },
            ]}
          >
            <Text
              style={[styles.caregiverText, { color: caregiverColor.text }]}
            >
              {session.caregiver.name}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>

        {/* Time range and duration */}
        <Text style={styles.timeText}>
          {formatTime(new Date(session.startedAt))} -{' '}
          {session.completedAt && formatTime(new Date(session.completedAt))} • {duration}
        </Text>

        {/* Summary line */}
        <Text style={styles.summaryText}>
          {session.summary.totalFeeds}{' '}
          {session.summary.totalFeeds === 1 ? 'feed' : 'feeds'} •{' '}
          {session.summary.totalMl}ml
          {session.summary.totalSleepMinutes > 0 && ` • ${sleepTime} sleep`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    maxWidth: 450,
    alignSelf: 'center',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Android shadow
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginTop: spacing.xs,
  },
  summaryText: {
    fontSize: typography.base,
    fontWeight: '500',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
});
