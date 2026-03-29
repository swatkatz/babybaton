import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import { formatShortTime } from '../utils/time';
import { formatDuration, formatMinutesToDuration } from '../utils/time';
import { FeedType, GetCurrentSessionQuery } from '../types/__generated__/graphql';

type CurrentSession = NonNullable<GetCurrentSessionQuery['getCurrentSession']>;
type Activity = CurrentSession['activities'][number];

interface ActivityCellProps {
  activity: Activity;
  onPress: (activityId: string) => void;
}

interface SeeAllCellProps {
  onPress: () => void;
}

function getIcon(activity: Activity): string {
  switch (activity.__typename) {
    case 'FeedActivity': {
      const feedType = activity.feedDetails?.feedType;
      if (feedType === FeedType.BreastMilk) return '🤱';
      if (feedType === FeedType.Solids) return '🥣';
      return '🍼';
    }
    case 'DiaperActivity': {
      const hadPoop = activity.diaperDetails?.hadPoop ?? false;
      const hadPee = activity.diaperDetails?.hadPee ?? false;
      if (hadPoop && hadPee) return '💩💧';
      if (hadPoop) return '💩';
      return '💧';
    }
    case 'SleepActivity':
      return '😴';
  }
}

function getDetail(activity: Activity): string {
  switch (activity.__typename) {
    case 'FeedActivity': {
      const feedType = activity.feedDetails?.feedType;
      if (feedType === FeedType.Solids) {
        return activity.feedDetails?.foodName ?? 'solids';
      }
      const amountMl = activity.feedDetails?.amountMl;
      return amountMl ? `${amountMl}ml` : 'fed';
    }
    case 'DiaperActivity': {
      const hadPoop = activity.diaperDetails?.hadPoop ?? false;
      const hadPee = activity.diaperDetails?.hadPee ?? false;
      if (hadPoop && hadPee) return 'both';
      if (hadPoop) return 'poop';
      return 'pee';
    }
    case 'SleepActivity': {
      const isActive = activity.sleepDetails?.isActive ?? false;
      const startTime = activity.sleepDetails?.startTime;
      const durationMinutes = activity.sleepDetails?.durationMinutes;
      if (isActive && startTime) {
        return formatDuration(new Date(startTime));
      }
      if (durationMinutes) {
        return formatMinutesToDuration(durationMinutes);
      }
      return 'sleep';
    }
  }
}

function getTime(activity: Activity): string {
  switch (activity.__typename) {
    case 'FeedActivity':
      return activity.feedDetails?.startTime
        ? formatShortTime(new Date(activity.feedDetails.startTime))
        : '';
    case 'DiaperActivity':
      return activity.diaperDetails?.changedAt
        ? formatShortTime(new Date(activity.diaperDetails.changedAt))
        : '';
    case 'SleepActivity':
      return activity.sleepDetails?.startTime
        ? formatShortTime(new Date(activity.sleepDetails.startTime))
        : '';
  }
}

function ActiveSleepIndicator() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.Text style={[styles.pulsingEmoji, { opacity: pulseAnim }]}>
      💤
    </Animated.Text>
  );
}

function LiveDuration({ startTime }: { startTime: string }) {
  const [duration, setDuration] = useState(() =>
    formatDuration(new Date(startTime))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(formatDuration(new Date(startTime)));
    }, 30_000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <Text style={styles.detailText}>{duration}</Text>;
}

export function ActivityCell({ activity, onPress }: ActivityCellProps) {
  const isActiveSleep =
    activity.__typename === 'SleepActivity' &&
    (activity.sleepDetails?.isActive ?? false);

  const icon = getIcon(activity);
  const time = getTime(activity);

  return (
    <TouchableOpacity
      style={[styles.cell, isActiveSleep && styles.activeSleepCell]}
      onPress={() => onPress(activity.id)}
      activeOpacity={0.7}
      testID={`activity-cell-${activity.id}`}
    >
      <Text style={styles.iconText}>{icon}</Text>
      <View style={styles.detailRow}>
        {isActiveSleep && activity.sleepDetails?.startTime ? (
          <LiveDuration startTime={activity.sleepDetails.startTime} />
        ) : (
          <Text style={styles.detailText}>{getDetail(activity)}</Text>
        )}
        {isActiveSleep && <ActiveSleepIndicator />}
      </View>
      <Text style={styles.timeText}>{time}</Text>
    </TouchableOpacity>
  );
}

export function SeeAllCell({ onPress }: SeeAllCellProps) {
  return (
    <TouchableOpacity
      style={styles.cell}
      onPress={onPress}
      activeOpacity={0.7}
      testID="see-all-cell"
    >
      <Text style={styles.seeAllText}>See All</Text>
      <Text style={styles.seeAllArrow}>→</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: '31.5%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  activeSleepCell: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  iconText: {
    fontSize: typography.xxl,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  detailText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pulsingEmoji: {
    fontSize: typography.sm,
  },
  timeText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  seeAllText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  seeAllArrow: {
    fontSize: typography.lg,
    color: colors.primary,
    marginTop: 4,
  },
});
