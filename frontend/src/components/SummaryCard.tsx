import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';

interface SummaryCardProps {
  icon: string;
  value: string;
  label: string;
  subtitle: string;
  onPress: () => void;
}

export function SummaryCard({ icon, value, label, subtitle, onPress }: SummaryCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} testID="summary-card">
      <View style={styles.chevron}>
        <Text style={styles.chevronText}>{'>'}</Text>
      </View>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: spacing.sm,
    position: 'relative',
  },
  chevron: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  chevronText: {
    fontSize: typography.lg,
    color: colors.primary,
    fontWeight: '600',
  },
  icon: {
    fontSize: typography.xxl,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: typography.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  label: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subtitle: {
    fontSize: typography.xs,
    color: colors.textLight,
    marginTop: 2,
  },
});
