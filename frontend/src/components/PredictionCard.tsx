import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import {
  PredictionConfidence,
  PredictionStatus,
  PredictionType,
  type GetPredictionsQuery,
} from '../types/__generated__/graphql';

type Prediction = GetPredictionsQuery['predictions'][number];

interface PredictionCardProps {
  prediction: Prediction;
  onPress?: () => void;
  onLogActivity?: () => void;
  onMarkAwake?: () => void;
  onDismiss?: () => void;
}

function getPredictionEmoji(predictionType: PredictionType): string {
  switch (predictionType) {
    case PredictionType.NextFeed:
      return '🍼';
    case PredictionType.NextNap:
      return '😴';
    case PredictionType.NextWake:
      return '☀️';
    case PredictionType.Bedtime:
      return '🌙';
    default:
      return '🔮';
  }
}

function getPredictionLabel(predictionType: PredictionType): string {
  switch (predictionType) {
    case PredictionType.NextFeed:
      return 'Next feed';
    case PredictionType.NextNap:
      return 'Next nap';
    case PredictionType.NextWake:
      return 'Next wake';
    case PredictionType.Bedtime:
      return 'Bedtime';
    default:
      return 'Prediction';
  }
}

function getConfidenceColor(confidence: PredictionConfidence): string {
  switch (confidence) {
    case PredictionConfidence.High:
      return colors.success;
    case PredictionConfidence.Medium:
      return colors.warning;
    case PredictionConfidence.Low:
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

function getConfidenceLabel(confidence: PredictionConfidence): string {
  switch (confidence) {
    case PredictionConfidence.High:
      return 'High';
    case PredictionConfidence.Medium:
      return 'Medium';
    case PredictionConfidence.Low:
      return 'Low';
    default:
      return String(confidence);
  }
}

function computeMinutesUntil(predictedTime: string): number {
  const now = new Date();
  const predicted = new Date(predictedTime);
  return Math.round((predicted.getTime() - now.getTime()) / 60000);
}

function formatTimeUntil(minutesUntil: number): string {
  if (minutesUntil <= 0) {
    const ago = Math.abs(minutesUntil);
    return `${ago} MIN AGO`;
  }
  const hours = Math.floor(minutesUntil / 60);
  const mins = minutesUntil % 60;
  return hours > 0 ? `~${hours}h ${mins}m` : `~${mins} min`;
}

function formatPredictedTime(predictedTime: string, isPlanned: boolean): string {
  const date = new Date(predictedTime);
  const formatted = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return isPlanned ? `~${formatted}` : formatted;
}

export function PredictionCard({
  prediction,
  onPress,
  onLogActivity,
  onMarkAwake,
  onDismiss,
}: PredictionCardProps) {
  const isOverdue = prediction.status === PredictionStatus.Overdue;
  const isPlanned = prediction.status === PredictionStatus.Planned;
  const minutesUntil = computeMinutesUntil(prediction.predictedTime);

  const cardStyle = [
    styles.card,
    isOverdue && styles.overdueCard,
    isPlanned && styles.plannedCard,
  ];

  return (
    <TouchableOpacity
      style={cardStyle}
      onPress={onPress}
      testID="prediction-card"
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardEmoji}>
          {getPredictionEmoji(prediction.predictionType)}
        </Text>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.cardTitle, isOverdue && styles.overdueText]}>
            {getPredictionLabel(prediction.predictionType)}
          </Text>
          <Text
            style={[
              styles.cardTime,
              isOverdue && styles.overdueTimeStrike,
            ]}
          >
            {formatPredictedTime(prediction.predictedTime, isPlanned)}
          </Text>
        </View>
        <View
          style={[
            styles.timeUntilContainer,
            isOverdue && styles.overdueTimeBadge,
          ]}
        >
          <Text
            style={[
              styles.timeUntilText,
              isOverdue && styles.overdueTimeBadgeText,
            ]}
          >
            {formatTimeUntil(minutesUntil)}
          </Text>
        </View>
      </View>

      {/* Confidence badge */}
      {prediction.confidence && (
        <View
          style={[
            styles.confidenceBadge,
            { backgroundColor: getConfidenceColor(prediction.confidence) },
          ]}
        >
          <Text style={styles.confidenceText}>
            {getConfidenceLabel(prediction.confidence)} confidence
          </Text>
        </View>
      )}

      {/* Predicted amount/duration */}
      {prediction.predictedAmountMl != null && (
        <Text style={styles.detailText}>~{prediction.predictedAmountMl} ml</Text>
      )}
      {prediction.predictedDurationMinutes != null && (
        <Text style={styles.detailText}>~{prediction.predictedDurationMinutes} min</Text>
      )}

      {/* Reasoning */}
      {prediction.reasoning && (
        <Text style={styles.reasoning} numberOfLines={2}>
          {prediction.reasoning}
        </Text>
      )}

      {/* OVERDUE CTAs */}
      {isOverdue && (
        <View style={styles.ctaRow}>
          {prediction.predictionType === PredictionType.NextWake && onMarkAwake ? (
            <TouchableOpacity style={styles.ctaPrimary} onPress={onMarkAwake}>
              <Text style={styles.ctaPrimaryText}>Mark as Awake</Text>
            </TouchableOpacity>
          ) : onLogActivity ? (
            <TouchableOpacity style={styles.ctaPrimary} onPress={onLogActivity}>
              <Text style={styles.ctaPrimaryText}>Log Activity</Text>
            </TouchableOpacity>
          ) : null}
          {onDismiss && (
            <TouchableOpacity style={styles.ctaSecondary} onPress={onDismiss}>
              <Text style={styles.ctaSecondaryText}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
    marginBottom: spacing.md,
  },
  overdueCard: {
    borderColor: colors.error,
    borderWidth: 2,
    backgroundColor: '#FFF5F5',
  },
  plannedCard: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: typography.xxl,
    marginRight: spacing.sm,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  overdueText: {
    color: colors.error,
  },
  cardTime: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overdueTimeStrike: {
    textDecorationLine: 'line-through',
    color: colors.textLight,
  },
  timeUntilContainer: {
    backgroundColor: colors.primaryLight,
    borderRadius: layout.radiusSmall,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  overdueTimeBadge: {
    backgroundColor: colors.error,
  },
  timeUntilText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  overdueTimeBadgeText: {
    color: colors.surface,
  },
  confidenceBadge: {
    alignSelf: 'flex-start',
    borderRadius: layout.radiusSmall,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  confidenceText: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.surface,
  },
  detailText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  reasoning: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  ctaRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  ctaPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: layout.radiusSmall,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  ctaPrimaryText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.surface,
  },
  ctaSecondary: {
    borderRadius: layout.radiusSmall,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  ctaSecondaryText: {
    fontSize: typography.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
