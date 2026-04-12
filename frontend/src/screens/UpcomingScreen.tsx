import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client/react';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import {
  GetPredictionsDocument,
  DismissPredictionDocument,
  PredictionType,
  type GetPredictionsQuery,
} from '../types/__generated__/graphql';
import { PredictionCard } from '../components/PredictionCard';
import predictionReadService from '../services/predictionReadService';
import type { HomeStackParamList } from '../navigation/MainTabNavigator';

const POLL_INTERVAL = 30 * 1000; // 30 seconds

type Prediction = GetPredictionsQuery['predictions'][number];

type Props = StackScreenProps<HomeStackParamList, 'Upcoming'>;

const SLEEP_TYPES: ReadonlySet<PredictionType> = new Set([
  PredictionType.NextNap,
  PredictionType.NextWake,
  PredictionType.Bedtime,
]);

// pickHighlights returns the next pending feed prediction and the next pending
// sleep-related prediction (nap, wake, or bedtime — whichever is soonest).
// We intentionally show at most two cards so the screen stays focused on what
// the caregiver needs to act on next.
function pickHighlights(predictions: readonly Prediction[]): Prediction[] {
  const byTime = (a: Prediction, b: Prediction) =>
    new Date(a.predictedTime).getTime() - new Date(b.predictedTime).getTime();

  const feeds = predictions
    .filter(p => p.predictionType === PredictionType.NextFeed)
    .slice()
    .sort(byTime);
  const sleeps = predictions
    .filter(p => SLEEP_TYPES.has(p.predictionType))
    .slice()
    .sort(byTime);

  const result: Prediction[] = [];
  if (feeds[0]) result.push(feeds[0]);
  if (sleeps[0]) result.push(sleeps[0]);
  result.sort(byTime);
  return result;
}

export function UpcomingScreen({ navigation }: Props) {
  const { data, loading, error, refetch } = useQuery(GetPredictionsDocument, {
    pollInterval: POLL_INTERVAL,
  });

  const [dismissPrediction] = useMutation(DismissPredictionDocument, {
    // Remove the prediction from the cached predictions list immediately so
    // the card disappears without waiting for a refetch round-trip.
    update: (cache, _result, options) => {
      const dismissedId = options.variables?.id;
      if (!dismissedId) return;
      cache.modify({
        fields: {
          predictions(existingRefs: readonly { __ref: string }[] = [], { readField }) {
            return existingRefs.filter(
              ref => readField('id', ref) !== dismissedId
            );
          },
        },
      });
    },
  });

  const predictions = data?.predictions ?? [];

  // Mark all predictions as read and prune stale entries when this screen is focused
  useFocusEffect(
    useCallback(() => {
      const ids = predictions.map(p => p.id);
      for (const id of ids) {
        predictionReadService.markAsRead(id);
      }
      predictionReadService.pruneStale(ids);
    }, [predictions])
  );

  const highlights = useMemo(() => pickHighlights(predictions), [predictions]);

  const handleDone = (predictionId: string) => {
    dismissPrediction({ variables: { id: predictionId } });
  };

  const handleSkipped = (predictionId: string) => {
    dismissPrediction({ variables: { id: predictionId } });
  };

  const handleCardPress = (prediction: Prediction) => {
    navigation.navigate('PredictionDetail', { predictionId: prediction.id });
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

  if (highlights.length === 0) {
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} testID="highlights-section">
        {highlights.map(prediction => (
          <PredictionCard
            key={prediction.id}
            prediction={prediction}
            onPress={() => handleCardPress(prediction)}
            onDone={() => handleDone(prediction.id)}
            onSkipped={() => handleSkipped(prediction.id)}
          />
        ))}
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
