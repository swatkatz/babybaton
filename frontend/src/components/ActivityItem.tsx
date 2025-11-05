import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Utensils, Droplets, Moon } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import { formatDuration, formatTime } from '../utils/time';
import { GetCurrentSessionQuery } from '../generated/graphql';
/**
 * ActivityItem Component
 * Displays a single activity (feed, diaper, or sleep)
 */
type CurrentSession = NonNullable<GetCurrentSessionQuery['getCurrentSession']>;
type Activity = CurrentSession['activities'][number];

interface ActivityItemProps {
  activity: Activity;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const getActivityIcon = () => {
    switch (activity.__typename) {
      case 'FeedActivity':
        return <Utensils size={28} color={colors.feed} />;
      case 'DiaperActivity':
        return <Droplets size={28} color={colors.diaper} />;
      case 'SleepActivity':
        return <Moon size={28} color={colors.sleep} />;
    }
  };

  const getIconBackgroundColor = () => {
    switch (activity.__typename) {
      case 'FeedActivity':
        return `${colors.feed}20`;
      case 'DiaperActivity':
        return `${colors.diaper}20`;
      case 'SleepActivity':
        return `${colors.sleep}20`;
    }
  };

  // Render different content based on activity type
  const renderActivityContent = () => {
    switch (activity.__typename) {
      case 'FeedActivity':
        const amountMl = activity.feedDetails?.amountMl;
        const feedType = activity.feedDetails?.feedType;
        const feedStartTime = activity.feedDetails?.startTime;
        const feedEndTime = activity.feedDetails?.endTime;

        return (
          <View style={styles.contentContainer}>
            <Text style={styles.mainText}>
              Fed {amountMl}ml {feedType?.toLowerCase().replace('_', ' ')}
            </Text>
            <Text style={styles.timestampText}>
              {feedStartTime && formatTime(new Date(feedStartTime))}
              {feedEndTime && ` - ${formatTime(new Date(feedEndTime))}`}
            </Text>
          </View>
        );

      case 'DiaperActivity':
        const changedAt = activity.diaperDetails?.changedAt;
        const hadPoop = activity.diaperDetails?.hadPoop;

        return (
          <View style={styles.contentContainer}>
            <Text style={styles.mainText}>
              Changed diaper {hadPoop && '💩'}
            </Text>
            <Text style={styles.timestampText}>
              {changedAt && formatTime(new Date(changedAt))}
            </Text>
          </View>
        );

      case 'SleepActivity':
        const isActive = activity.sleepDetails?.isActive ?? false;
        const startTime = activity.sleepDetails?.startTime;
        const durationMinutes = activity.sleepDetails?.durationMinutes;

        const duration =
          isActive && startTime
            ? formatDuration(new Date(startTime))
            : durationMinutes
              ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
              : '';

        return (
          <View style={styles.contentContainer}>
            <Text style={styles.mainText}>
              Sleeping {duration && `(${duration})`}
              {isActive && <Text style={styles.liveIndicator}> LIVE </Text>}
            </Text>
            <Text style={styles.timestampText}>
              Started: {startTime && formatTime(new Date(startTime))}
              {activity.sleepDetails?.endTime &&
                ` - ${formatTime(new Date(activity.sleepDetails.endTime))}`}
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
