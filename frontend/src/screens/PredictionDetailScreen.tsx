import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@apollo/client/react';
import { StackScreenProps } from '@react-navigation/stack';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import {
  GetPredictionsDocument,
  PredictionConfidence,
  PredictionStatus,
  PredictionType,
} from '../types/__generated__/graphql';
import type { HomeStackParamList } from '../navigation/MainTabNavigator';

type Props = StackScreenProps<HomeStackParamList, 'PredictionDetail'>;

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

function getStatusLabel(status: PredictionStatus): string {
  switch (status) {
    case PredictionStatus.Overdue:
      return 'Overdue';
    case PredictionStatus.Upcoming:
      return 'Coming Up';
    case PredictionStatus.Planned:
      return 'Planned';
    default:
      return String(status);
  }
}

function getStatusColor(status: PredictionStatus): string {
  switch (status) {
    case PredictionStatus.Overdue:
      return colors.error;
    case PredictionStatus.Upcoming:
      return colors.primary;
    case PredictionStatus.Planned:
      return colors.textLight;
    default:
      return colors.textSecondary;
  }
}

export function PredictionDetailScreen({ route }: Props) {
  const { predictionId } = route.params;

  const { data } = useQuery(GetPredictionsDocument);

  const prediction = data?.predictions.find(p => p.id === predictionId);

  if (!prediction) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Prediction not found</Text>
      </View>
    );
  }

  const predictedDate = new Date(prediction.predictedTime);
  const formattedTime = predictedDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Icon */}
      <Text style={styles.emoji}>
        {getPredictionEmoji(prediction.predictionType)}
      </Text>

      {/* Label */}
      <Text style={styles.title}>
        {getPredictionLabel(prediction.predictionType)}
      </Text>

      {/* Predicted time */}
      <Text style={styles.time}>{formattedTime}</Text>

      {/* Status badge */}
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(prediction.status) },
        ]}
      >
        <Text style={styles.statusText}>
          {getStatusLabel(prediction.status)}
        </Text>
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
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Estimated amount</Text>
          <Text style={styles.detailValue}>~{prediction.predictedAmountMl} ml</Text>
        </View>
      )}
      {prediction.predictedDurationMinutes != null && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Estimated duration</Text>
          <Text style={styles.detailValue}>~{prediction.predictedDurationMinutes} min</Text>
        </View>
      )}

      {/* Reasoning */}
      {prediction.reasoning && (
        <View style={styles.reasoningContainer}>
          <Text style={styles.reasoningLabel}>Why this prediction?</Text>
          <Text style={styles.reasoningText}>{prediction.reasoning}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  notFoundText: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  time: {
    fontSize: typography.xl,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  statusBadge: {
    borderRadius: layout.radiusRound,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  statusText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.surface,
  },
  confidenceBadge: {
    borderRadius: layout.radiusRound,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  confidenceText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.surface,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailLabel: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  reasoningContainer: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasoningLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  reasoningText: {
    fontSize: typography.base,
    color: colors.textPrimary,
    lineHeight: 24,
  },
});
