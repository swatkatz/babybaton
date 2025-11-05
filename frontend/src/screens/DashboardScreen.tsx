// src/screens/DashboardScreen.tsx

import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { PredictionCard } from '../components/PredictionCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { CurrentSessionCard } from '../components/CurrentSessionCard';
import { RecentSessionCard } from '../components/RecentSessionCard';
import {
  useGetPredictionQuery,
  useGetCurrentSessionQuery,
  useGetRecentSessionsQuery,
} from '../generated/graphql';

/**
 * Dashboard Screen - Main overview screen showing:
 * - Next feed prediction
 * - Current care session
 * - Recent care sessions
 */
export function DashboardScreen() {
  const handlePredictionPress = () => {
    console.log('Prediction card pressed!');
    // TODO: Navigate to PredictionDetailScreen
  };

  const handleSessionPress = () => {
    console.log('Current session card pressed!');
    // TODO: Navigate to HandleDetailScreen
  };

  const handleRecentSessionPress = (sessionId: string) => {
    console.log('Recent session pressed:', sessionId);
  };

  const {
    data: predictionData,
    loading: predictionLoading,
    error: predictionError,
  } = useGetPredictionQuery();

  const {
    data: sessionData,
    loading: sessionLoading,
    error: sessionError,
  } = useGetCurrentSessionQuery();

  const {
    data: recentSessionsData,
    loading: recentSessionsLoading,
    error: recentSessionsError,
  } = useGetRecentSessionsQuery({
    variables: { limit: 3 },
  });

  const currentSession = sessionData?.getCurrentSession;
  const recentSessions = recentSessionsData?.getRecentCareSessions ?? [];

  // Convert the prediction (DateTime string -> Date)
  const prediction = predictionData?.predictNextFeed;
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Next Feed Prediction */}
        {predictionLoading && <Text>Loading prediction...</Text>}
        {predictionError && <Text>Error loading prediction</Text>}
        {prediction && (
          <PredictionCard
            prediction={prediction}
            onPress={handlePredictionPress}
          />
        )}

        {/* Spacing between cards */}
        <View style={{ height: spacing.md }} />

        {/* Current Care Session */}
        {sessionLoading && <Text>Loading session...</Text>}
        {sessionError && <Text>Error loading session</Text>}
        {currentSession && (
          <CurrentSessionCard
            session={currentSession}
            onPress={handleSessionPress}
          />
        )}

        {/* Spacing */}
        <View style={{ height: spacing.md }} />

        {/* Recent Care Sessions Header */}
        <Text style={styles.sectionTitle}>📋 Recent Care Sessions</Text>

        {/* Recent Sessions List */}
        {recentSessionsLoading && <Text>Loading recent sessions...</Text>}
        {recentSessionsError && <Text>Error loading recent sessions</Text>}
        {recentSessions.map((session) => (
          <View key={session.id}>
            <RecentSessionCard
              session={session}
              onPress={() => handleRecentSessionPress(session.id)}
            />
            <View style={{ height: spacing.sm }} />
          </View>
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
  content: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
});
