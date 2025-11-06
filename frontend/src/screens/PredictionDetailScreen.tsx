import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';

type Props = StackScreenProps<RootStackParamList, 'PredictionDetail'>;

export function PredictionDetailScreen({ route }: Props) {
  const { prediction } = route.params;

  // Convert DateTime string to Date for display
  const predictedDate = new Date(prediction.predictedTime);
  const now = new Date();

  // Format the predicted time
  const formattedTime = predictedDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const formattedDate = predictedDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Calculate time until feed
  const hoursUntil = Math.floor(prediction.minutesUntilFeed / 60);
  const minutesUntil = prediction.minutesUntilFeed % 60;

  // Determine if feed is soon (within 30 minutes)
  const isSoon = prediction.minutesUntilFeed <= 30;

  // Get confidence color
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HIGH':
        return colors.success;
      case 'MEDIUM':
        return colors.warning;
      case 'LOW':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'HIGH':
        return 'High Confidence';
      case 'MEDIUM':
        return 'Medium Confidence';
      case 'LOW':
        return 'Low Confidence';
      default:
        return confidence;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Predicted Time Card */}
        <View style={styles.card}>
          <Text style={styles.label}>Next Feed Predicted</Text>
          <Text style={styles.timeText}>{formattedTime}</Text>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>

        {/* Time Until Feed */}
        <View style={[styles.card, isSoon && styles.soonCard]}>
          <Text style={[styles.label, isSoon && styles.soonText]}>
            Time Until Feed
          </Text>
          <Text style={[styles.durationText, isSoon && styles.soonText]}>
            {hoursUntil > 0 && `${hoursUntil}h `}
            {minutesUntil}m
          </Text>
          {isSoon && (
            <Text style={styles.soonBadge}>Feed time approaching!</Text>
          )}
        </View>

        {/* Confidence Badge */}
        <View
          style={[
            styles.confidenceBadge,
            { backgroundColor: getConfidenceColor(prediction.confidence) },
          ]}
        >
          <Text style={styles.confidenceText}>
            {getConfidenceLabel(prediction.confidence)}
          </Text>
        </View>

        {/* Reasoning */}
        {prediction.reasoning && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Analysis</Text>
            <Text style={styles.reasoningText}>{prediction.reasoning}</Text>
          </View>
        )}

        {/* Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            This prediction is based on recent feeding patterns and historical
            data. Times may vary based on baby's needs.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  soonCard: {
    borderColor: colors.warning,
    borderWidth: 2,
    backgroundColor: '#FFF9E6',
  },
  label: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  soonText: {
    color: '#B8860B',
  },
  timeText: {
    fontSize: typography.xxxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  dateText: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  durationText: {
    fontSize: typography.xxl,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  soonBadge: {
    marginTop: spacing.sm,
    fontSize: typography.sm,
    fontWeight: '600',
    color: '#B8860B',
  },
  confidenceBadge: {
    alignSelf: 'flex-start',
    borderRadius: layout.radiusSmall,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  confidenceText: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.surface,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  reasoningText: {
    fontSize: typography.base,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: layout.radiusMedium,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  infoText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
