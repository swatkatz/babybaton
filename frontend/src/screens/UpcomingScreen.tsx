import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@apollo/client/react';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import {
  GetPredictionsDocument,
  PredictionConfidence,
  PredictionStatus,
  PredictionType,
  ActivityType,
} from '../types/__generated__/graphql';
import predictionReadService from '../services/predictionReadService';

const NEEDS_ATTENTION_THRESHOLD = 10;

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

function computeMinutesUntil(predictedTime: string): number {
  const now = new Date();
  const predicted = new Date(predictedTime);
  return Math.round((predicted.getTime() - now.getTime()) / 60000);
}

function formatTimeUntil(minutesUntil: number): string {
  if (minutesUntil <= 0) return 'Overdue';
  const hours = Math.floor(minutesUntil / 60);
  const mins = minutesUntil % 60;
  return hours > 0 ? `~${hours}h ${mins}m` : `~${mins} min`;
}

export function UpcomingScreen() {
  const { data, loading, error, refetch } = useQuery(GetPredictionsDocument, {
    pollInterval: 30000,
  });

  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const predictions = data?.predictions ?? [];

  // Stable key for dependency tracking - only re-run when prediction IDs change
  const predictionIdsKey = useMemo(
    () => predictions.map(p => p.id).join(','),
    [predictions]
  );

  // Check read state on focus and when predictions change
  useFocusEffect(
    useCallback(() => {
      const checkReadState = async () => {
        const newReadIds = new Set<string>();
        for (const p of predictions) {
          const read = await predictionReadService.isRead(p.id);
          if (read) newReadIds.add(p.id);
        }
        setReadIds(prev => {
          const prevArr = [...prev].sort().join(',');
          const newArr = [...newReadIds].sort().join(',');
          return prevArr === newArr ? prev : newReadIds;
        });
      };
      checkReadState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [predictionIdsKey])
  );

  const handleMarkAsRead = async (predictionId: string) => {
    await predictionReadService.markAsRead(predictionId);
    setReadIds(prev => new Set(prev).add(predictionId));
  };

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load predictions</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetch()}
          testID="retry-button"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (predictions.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>🔮</Text>
        <Text style={styles.emptyTitle}>No predictions yet</Text>
        <Text style={styles.emptySubtitle}>
          Predictions will appear here once enough feeding data has been logged.
        </Text>
      </View>
    );
  }

  const overduePredictions = predictions.filter(p => p.status === PredictionStatus.Overdue);
  const upcomingPredictions = predictions.filter(p => p.status !== PredictionStatus.Overdue);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Needs Attention Section */}
        {overduePredictions.length > 0 && (
          <View testID="needs-attention-section">
            <Text style={styles.sectionHeaderWarning}>⚠️  NEEDS ATTENTION</Text>
            {overduePredictions.map(prediction => {
              const isRead = readIds.has(prediction.id);
              return (
                <View
                  key={prediction.id}
                  style={[styles.card, styles.warningCard, isRead && styles.readCard]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardEmoji}>{getPredictionEmoji(prediction.predictionType)}</Text>
                    <View style={styles.cardHeaderText}>
                      <Text style={[styles.cardTitle, styles.warningText]}>
                        {getPredictionLabel(prediction.predictionType)} due now
                      </Text>
                      {prediction.reasoning && (
                        <Text style={styles.cardSubtitle}>{prediction.reasoning}</Text>
                      )}
                    </View>
                  </View>
                  {!isRead && (
                    <TouchableOpacity
                      style={styles.markReadButton}
                      onPress={() => handleMarkAsRead(prediction.id)}
                      testID="mark-read-button"
                    >
                      <Text style={styles.markReadText}>Mark as read</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Predictions Section */}
        <Text style={styles.sectionHeader}>📊  PREDICTIONS</Text>
        {predictions.map(prediction => {
          const minutesUntil = computeMinutesUntil(prediction.predictedTime);
          const needsAttention = minutesUntil <= NEEDS_ATTENTION_THRESHOLD;
          const isRead = readIds.has(prediction.id);

          const predictedDate = new Date(prediction.predictedTime);
          const formattedTime = predictedDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });

          return (
            <View
              key={prediction.id}
              style={[styles.card, isRead && styles.readCard]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardEmoji}>{getPredictionEmoji(prediction.predictionType)}</Text>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>{getPredictionLabel(prediction.predictionType)}</Text>
                  <Text style={styles.cardTime}>{formattedTime}</Text>
                </View>
                <View style={styles.timeUntilContainer}>
                  <Text style={styles.timeUntilText}>{formatTimeUntil(minutesUntil)}</Text>
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

              {/* Reasoning */}
              {prediction.reasoning && (
                <Text style={styles.reasoning}>{prediction.reasoning}</Text>
              )}

              {!isRead && !needsAttention && (
                <TouchableOpacity
                  style={styles.markReadButton}
                  onPress={() => handleMarkAsRead(prediction.id)}
                  testID="mark-read-button"
                >
                  <Text style={styles.markReadText}>Mark as read</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    padding: spacing.md,
  },
  sectionHeader: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionHeaderWarning: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.error,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningCard: {
    borderColor: colors.error,
    borderWidth: 2,
    backgroundColor: '#FFF5F5',
  },
  readCard: {
    opacity: 0.5,
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
  warningText: {
    color: colors.error,
  },
  cardSubtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardTime: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timeUntilContainer: {
    backgroundColor: colors.primaryLight,
    borderRadius: layout.radiusSmall,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  timeUntilText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.primaryDark,
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
  reasoning: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  markReadButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: layout.radiusSmall,
    borderWidth: 1,
    borderColor: colors.border,
  },
  markReadText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  errorText: {
    fontSize: typography.base,
    color: colors.error,
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: layout.radiusSmall,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryText: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.surface,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
