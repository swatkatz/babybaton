import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityCell, SeeAllCell } from './ActivityCell';
import { spacing } from '../theme/spacing';
import { GetCurrentSessionQuery } from '../types/__generated__/graphql';

type CurrentSession = NonNullable<GetCurrentSessionQuery['getCurrentSession']>;
type Activity = CurrentSession['activities'][number];

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

  // Sort most recent first by createdAt
  const sorted = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
