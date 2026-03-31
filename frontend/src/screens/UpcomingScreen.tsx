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
  PredictionStatus,
  type GetPredictionsQuery,
} from '../types/__generated__/graphql';
import { PredictionCard } from '../components/PredictionCard';
import predictionReadService from '../services/predictionReadService';
import type { HomeStackParamList } from '../navigation/MainTabNavigator';

const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes

type Prediction = GetPredictionsQuery['predictions'][number];

type Props = StackScreenProps<HomeStackParamList, 'Upcoming'>;

function groupByStatus(predictions: readonly Prediction[]) {
  const overdue: Prediction[] = [];
  const upcoming: Prediction[] = [];
  const planned: Prediction[] = [];

  for (const p of predictions) {
    switch (p.status) {
      case PredictionStatus.Overdue:
        overdue.push(p);
        break;
      case PredictionStatus.Upcoming:
        upcoming.push(p);
        break;
      case PredictionStatus.Planned:
        planned.push(p);
        break;
    }
  }

  // Sort each group by predictedTime ascending
  const byTime = (a: Prediction, b: Prediction) =>
    new Date(a.predictedTime).getTime() - new Date(b.predictedTime).getTime();
  overdue.sort(byTime);
  upcoming.sort(byTime);
  planned.sort(byTime);

  return { overdue, upcoming, planned };
}

export function UpcomingScreen({ navigation }: Props) {
  const { data, loading, error, refetch } = useQuery(GetPredictionsDocument, {
    pollInterval: POLL_INTERVAL,
  });

  const [dismissPrediction] = useMutation(DismissPredictionDocument, {
    refetchQueries: ['GetPredictions'],
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

  const { overdue, upcoming, planned } = useMemo(
    () => groupByStatus(predictions),
    [predictions]
  );

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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* OVERDUE section */}
        {overdue.length > 0 && (
          <View testID="overdue-section">
            <Text style={styles.sectionHeaderOverdue}>OVERDUE</Text>
            {overdue.map(prediction => (
              <PredictionCard
                key={prediction.id}
                prediction={prediction}
                onPress={() => handleCardPress(prediction)}
                onDone={() => handleDone(prediction.id)}
                onSkipped={() => handleSkipped(prediction.id)}
              />
            ))}
          </View>
        )}

        {/* UPCOMING section (Coming Up) */}
        {upcoming.length > 0 && (
          <View testID="upcoming-section">
            <Text style={styles.sectionHeader}>COMING UP</Text>
            {upcoming.map(prediction => (
              <PredictionCard
                key={prediction.id}
                prediction={prediction}
                onPress={() => handleCardPress(prediction)}
              />
            ))}
          </View>
        )}

        {/* PLANNED section (Rest of Day) */}
        {planned.length > 0 && (
          <View testID="planned-section">
            <Text style={styles.sectionHeader}>REST OF DAY</Text>
            <Text style={styles.plannedDisclaimer}>
              Updates as activities are logged
            </Text>
            {planned.map(prediction => (
              <PredictionCard
                key={prediction.id}
                prediction={prediction}
                onPress={() => handleCardPress(prediction)}
              />
            ))}
          </View>
        )}
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
  sectionHeaderOverdue: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.error,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  plannedDisclaimer: {
    fontSize: typography.xs,
    color: colors.textLight,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
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
