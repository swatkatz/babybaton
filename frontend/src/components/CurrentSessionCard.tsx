import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, getCaregiverColor } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import { ChevronRight } from 'lucide-react-native';
import { ActivityGrid } from './ActivityGrid';
import { formatDuration, formatTime } from '../utils/time';
import { GetCurrentSessionQuery } from '../types/__generated__/graphql';

interface CurrentSessionCardProps {
  session: NonNullable<GetCurrentSessionQuery['getCurrentSession']>;
  onPress: () => void;
  onActivityPress?: (activityId: string) => void;
}
export function CurrentSessionCard({
  session,
  onPress,
  onActivityPress,
}: CurrentSessionCardProps) {
  const caregiverColor = getCaregiverColor(session.caregiver.id);
  const duration = formatDuration(new Date(session.startedAt));

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>📋 Ongoing Care Session</Text>
            <ChevronRight size={20} color={colors.textSecondary} />
          </View>

          {/* Caregiver Badge */}
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

          {/* Session Info */}
          <Text style={styles.sessionInfo}>
            Started: {formatTime(new Date(session.startedAt))} • Duration:{' '}
            {duration}
          </Text>
        </View>

        {/* Activity Grid */}
        <View style={styles.activitiesList}>
          <ActivityGrid
            activities={session.activities}
            onActivityPress={onActivityPress ?? (() => onPress())}
            onSeeAll={onPress}
          />
        </View>

        {/* Footer Summary */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {session.activities.length}{' '}
            {session.activities.length === 1 ? 'activity' : 'activities'} total
          </Text>
        </View>
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
    elevation: 3,
  },
  header: {
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.textPrimary,
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
  sessionInfo: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  activitiesList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  footerText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
