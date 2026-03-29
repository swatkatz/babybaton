import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityCell, SeeAllCell } from './ActivityCell';
import { spacing } from '../theme/spacing';
import { GetCurrentSessionQuery } from '../types/__generated__/graphql';

type CurrentSession = NonNullable<GetCurrentSessionQuery['getCurrentSession']>;
type Activity = CurrentSession['activities'][number];

function getActivityTime(activity: Activity): number {
  let time: string | undefined;
  switch (activity.__typename) {
    case 'FeedActivity':
      time = activity.feedDetails?.startTime;
      break;
    case 'DiaperActivity':
      time = activity.diaperDetails?.changedAt;
      break;
    case 'SleepActivity':
      time = activity.sleepDetails?.startTime;
      break;
  }
  return new Date(time ?? activity.createdAt).getTime();
}

interface ActivityGridProps {
  activities: Activity[];
  onActivityPress: (activityId: string) => void;
  onSeeAll: () => void;
}

export function ActivityGrid({
  activities,
  onActivityPress,
  onSeeAll,
}: ActivityGridProps) {
  if (activities.length === 0) return null;

  // Sort most recent first by the activity's actual time
  const sorted = [...activities].sort(
    (a, b) => getActivityTime(b) - getActivityTime(a)
  );

  const showSeeAll = sorted.length >= 6;
  const displayed = showSeeAll ? sorted.slice(0, 5) : sorted;

  return (
    <View style={styles.grid} testID="activity-grid">
      {displayed.map((activity) => (
        <ActivityCell
          key={activity.id}
          activity={activity}
          onPress={onActivityPress}
        />
      ))}
      {showSeeAll && <SeeAllCell onPress={onSeeAll} />}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'flex-start',
  },
});
