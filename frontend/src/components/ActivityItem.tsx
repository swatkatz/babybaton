import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Utensils, Droplets, Moon } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import { Activity } from '../types/activity';
import { formatDuration, formatTime } from '../utils/time';
/**
 * ActivityItem Component
 * Displays a single activity (feed, diaper, or sleep)
 * TODO: Replace with generated Activity type from GraphQL codegen
 */
interface ActivityItemProps {
  activity: Activity;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  // Get icon and color based on activity type
  const getActivityIcon = () => {
    switch (activity.activityType) {
      case 'FEED':
        return <Utensils size={28} color={colors.feed} />;
      case 'DIAPER':
        return <Droplets size={28} color={colors.diaper} />;
      case 'SLEEP':
        return <Moon size={28} color={colors.sleep} />;
    }
  };

  // Get background color for icon based on activity type
  const getIconBackgroundColor = () => {
    switch (activity.activityType) {
      case 'FEED':
        return `${colors.feed}20`; // 20 is hex for ~12.5% opacity
      case 'DIAPER':
        return `${colors.diaper}20`;
      case 'SLEEP':
        return `${colors.sleep}20`;
    }
  };

  // Render different content based on activity type
  const renderActivityContent = () => {
    switch (activity.activityType) {
      case 'FEED':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.mainText}>
              Fed {activity.feedDetails.amountMl}ml{' '}
              {activity.feedDetails.feedType.toLowerCase().replace('_', ' ')}
            </Text>
            <Text style={styles.timestampText}>
              {formatTime(activity.feedDetails.startTime)}
              {activity.feedDetails.endTime &&
                ` - ${formatTime(activity.feedDetails.endTime)}`}
            </Text>
          </View>
        );

      case 'DIAPER':
        // TypeScript knows: activity.diaperDetails exists!
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.mainText}>
              Changed diaper {activity.diaperDetails.hadPoop && '💩'}
            </Text>
            <Text style={styles.timestampText}>
              {formatTime(activity.diaperDetails.changedAt)}
            </Text>
          </View>
        );

      case 'SLEEP':
        // TypeScript knows: activity.sleepDetails exists!
        const isActive = activity.sleepDetails.isActive;
        const duration = isActive
          ? formatDuration(activity.sleepDetails.startTime)
          : activity.sleepDetails.durationMinutes
            ? `${Math.floor(activity.sleepDetails.durationMinutes / 60)}h ${activity.sleepDetails.durationMinutes % 60}m`
            : '';

        return (
          <View style={styles.contentContainer}>
            <Text style={styles.mainText}>
              Sleeping {duration && `(${duration})`}
              {isActive && <Text style={styles.liveIndicator}> LIVE </Text>}
            </Text>
            <Text style={styles.timestampText}>
              Started: {formatTime(activity.sleepDetails.startTime)}
              {activity.sleepDetails.endTime &&
                ` - ${formatTime(activity.sleepDetails.endTime)}`}
            </Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.horizontalLayout}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getIconBackgroundColor() },
          ]}
        >
          {getActivityIcon()}
        </View>
        <View style={styles.contentWrapper}>{renderActivityContent()}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  horizontalLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: layout.radiusRound,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  contentWrapper: {
    flex: 1,
  },
  contentContainer: {
    gap: 4,
  },
  mainText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timestampText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  liveIndicator: {
    fontWeight: '700',
    color: colors.error,
  },
});
