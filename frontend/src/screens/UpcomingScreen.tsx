import React, { useState, useCallback } from 'react';
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
import { GetPredictionDocument, PredictionConfidence } from '../types/__generated__/graphql';
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

export function UpcomingScreen() {
  const { data, loading, error, refetch } = useQuery(GetPredictionDocument, {
    pollInterval: 30000,
  });

  const [isRead, setIsRead] = useState(false);

  const prediction = data?.predictNextFeed;

  // Check read state on focus and when prediction changes
  useFocusEffect(
    useCallback(() => {
      if (prediction?.predictedTime) {
        predictionReadService.isRead(prediction.predictedTime).then(setIsRead);
      } else {
        setIsRead(false);
      }
    }, [prediction?.predictedTime])
  );

  const handleMarkAsRead = async () => {
    if (prediction?.predictedTime) {
      await predictionReadService.markAsRead(prediction.predictedTime);
      setIsRead(true);
    }
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

  if (!prediction) {
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

  const predictedDate = new Date(prediction.predictedTime);
  const formattedTime = predictedDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const minutesUntil = prediction.minutesUntilFeed;
  const needsAttention = minutesUntil <= NEEDS_ATTENTION_THRESHOLD;

  const hoursUntil = Math.floor(Math.abs(minutesUntil) / 60);
  const minsUntil = Math.abs(minutesUntil) % 60;
  const timeUntilText =
    minutesUntil <= 0
      ? 'Overdue'
      : hoursUntil > 0
        ? `~${hoursUntil}h ${minsUntil}m`
        : `~${minsUntil} min`;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Needs Attention Section */}
        {needsAttention && (
          <View testID="needs-attention-section">
            <Text style={styles.sectionHeaderWarning}>⚠️  NEEDS ATTENTION</Text>
            <View
              style={[
                styles.card,
                styles.warningCard,
                isRead && styles.readCard,
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardEmoji}>🍼</Text>
                <View style={styles.cardHeaderText}>
                  <Text style={[styles.cardTitle, styles.warningText]}>
                    Feed due {minutesUntil <= 0 ? 'now' : `in ${timeUntilText}`}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    Based on feeding pattern
                  </Text>
                </View>
              </View>
              {!isRead && (
                <TouchableOpacity
                  style={styles.markReadButton}
                  onPress={handleMarkAsRead}
                  testID="mark-read-button"
                >
                  <Text style={styles.markReadText}>Mark as read</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Predictions Section */}
        <Text style={styles.sectionHeader}>📊  PREDICTIONS</Text>
        <View
          style={[
            styles.card,
            isRead && styles.readCard,
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardEmoji}>🍼</Text>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Next feed</Text>
              <Text style={styles.cardTime}>{formattedTime}</Text>
            </View>
            <View style={styles.timeUntilContainer}>
              <Text style={styles.timeUntilText}>{timeUntilText}</Text>
            </View>
          </View>

          {/* Confidence badge */}
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

          {/* Reasoning */}
          {prediction.reasoning && (
            <Text style={styles.reasoning}>{prediction.reasoning}</Text>
          )}

          {!isRead && !needsAttention && (
            <TouchableOpacity
              style={styles.markReadButton}
              onPress={handleMarkAsRead}
              testID="mark-read-button"
            >
              <Text style={styles.markReadText}>Mark as read</Text>
            </TouchableOpacity>
          )}
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
