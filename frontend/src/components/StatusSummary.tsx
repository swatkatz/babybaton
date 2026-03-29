import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import { formatRelativeTime } from '../utils/time';
import { formatDuration, formatMinutesToDuration } from '../utils/time';
import type { GetBabyStatusQuery } from '../types/__generated__/graphql';

type BabyStatus = GetBabyStatusQuery['getBabyStatus'];

interface StatusSummaryProps {
  status: BabyStatus;
}

export function StatusSummary({ status }: StatusSummaryProps) {
  return (
    <View style={styles.card}>
      <FeedRow feed={status.lastFeed} />
      <View style={styles.divider} />
      <SleepRow sleep={status.lastSleep} />
      <View style={styles.divider} />
      <DiaperRow diaper={status.lastDiaper} />
    </View>
  );
}

function FeedRow({ feed }: { feed: BabyStatus['lastFeed'] }) {
  if (!feed) {
    return <EmptyRow icon="🍼" label="No feeds yet" />;
  }

  const time = formatRelativeTime(new Date(feed.feedDetails?.startTime ?? feed.createdAt));
  const details = formatFeedDetails(feed.feedDetails);

  return (
    <View style={styles.row}>
      <Text style={styles.icon}>🍼</Text>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>Last feed: {time}</Text>
        {details ? <Text style={styles.rowDetail}>{details}</Text> : null}
      </View>
    </View>
  );
}

function formatFeedDetails(
  feedDetails: NonNullable<BabyStatus['lastFeed']>['feedDetails']
): string | null {
  if (!feedDetails) return null;

  const { amountMl, feedType, foodName } = feedDetails;

  if (feedType === 'SOLIDS' && foodName) {
    return foodName;
  }

  const parts: string[] = [];
  if (amountMl) parts.push(`${amountMl}ml`);
  if (feedType) {
    const typeLabel =
      feedType === 'BREAST_MILK' ? 'breast milk' : feedType.toLowerCase();
    parts.push(typeLabel);
  }

  return parts.length > 0 ? parts.join(' ') : null;
}

function SleepRow({ sleep }: { sleep: BabyStatus['lastSleep'] }) {
  if (!sleep) {
    return <EmptyRow icon="😴" label="No sleep yet" />;
  }

  const isActive = sleep.sleepDetails?.isActive === true;

  if (isActive && sleep.sleepDetails?.startTime) {
    const liveDuration = formatDuration(new Date(sleep.sleepDetails.startTime));
    return (
      <View style={styles.row}>
        <Text style={styles.icon}>😴</Text>
        <View style={styles.rowContent}>
          <Text style={styles.rowLabel}>Sleeping now</Text>
          <Text style={styles.rowDetail}>{liveDuration}</Text>
        </View>
      </View>
    );
  }

  const time = formatRelativeTime(
    new Date(sleep.sleepDetails?.startTime ?? sleep.createdAt)
  );
  const duration =
    sleep.sleepDetails?.durationMinutes != null
      ? formatMinutesToDuration(sleep.sleepDetails.durationMinutes)
      : null;

  return (
    <View style={styles.row}>
      <Text style={styles.icon}>😴</Text>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>Last sleep: {time}</Text>
        {duration ? <Text style={styles.rowDetail}>{duration}</Text> : null}
      </View>
    </View>
  );
}

function DiaperRow({ diaper }: { diaper: BabyStatus['lastDiaper'] }) {
  if (!diaper) {
    return <EmptyRow icon="💧" label="No diapers yet" />;
  }

  const time = formatRelativeTime(
    new Date(diaper.diaperDetails?.changedAt ?? diaper.createdAt)
  );
  const { icon, label } = formatDiaperType(diaper.diaperDetails);

  return (
    <View style={styles.row}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>Last diaper: {time}</Text>
        <Text style={styles.rowDetail}>{label}</Text>
      </View>
    </View>
  );
}

function formatDiaperType(
  details: NonNullable<BabyStatus['lastDiaper']>['diaperDetails']
): { icon: string; label: string } {
  if (!details) return { icon: '💧', label: 'changed' };

  const { hadPoop, hadPee } = details;
  if (hadPoop && hadPee) return { icon: '💩💧', label: 'poop + pee' };
  if (hadPoop) return { icon: '💩', label: 'poop' };
  return { icon: '💧', label: 'pee' };
}

function EmptyRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.rowContent}>
        <Text style={styles.emptyLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  icon: {
    fontSize: typography.lg,
    width: 32,
    textAlign: 'center',
  },
  rowContent: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  rowLabel: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowDetail: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyLabel: {
    fontSize: typography.base,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
});
