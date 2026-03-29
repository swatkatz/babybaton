import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, getCaregiverColor } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import { formatTime } from '../utils/time';

interface CompactCurrentSessionCardProps {
  caregiverName: string;
  caregiverId: string;
  startedAt: string;
  activityCount: number;
  onPress: () => void;
}

export function CompactCurrentSessionCard({
  caregiverName,
  caregiverId,
  startedAt,
  activityCount,
  onPress,
}: CompactCurrentSessionCardProps) {
  const caregiverColor = getCaregiverColor(caregiverId);

  return (
    <TouchableOpacity onPress={onPress} style={styles.card} testID="compact-current-session">
      <View style={styles.row}>
        <View testID="active-indicator" style={styles.activeDot} />
        <View
          style={[styles.caregiverBadge, { backgroundColor: caregiverColor.bg }]}
        >
          <Text style={[styles.caregiverText, { color: caregiverColor.text }]}>
            {caregiverName}
          </Text>
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.timeText}>
            {formatTime(new Date(startedAt))} - now
          </Text>
          <Text style={styles.countText}>
            {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
          </Text>
        </View>
        <ChevronRight size={20} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    borderWidth: 1,
    borderColor: colors.success,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    marginRight: spacing.xs,
  },
  caregiverBadge: {
    borderRadius: layout.radiusSmall,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
  },
  caregiverText: {
    fontSize: typography.sm,
    fontWeight: '600',
  },
  infoContainer: {
    flex: 1,
  },
  timeText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  countText: {
    fontSize: typography.xs,
    color: colors.textLight,
  },
});
