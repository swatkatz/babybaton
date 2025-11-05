// src/screens/DashboardScreen.tsx

import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { PredictionCard } from '../components/PredictionCard';
import { mockPrediction } from '../graphql/predictionMock';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { CurrentSessionCard } from '../components/CurrentSessionCard';
import { mockCurrentSession, mockRecentSessions } from '../graphql/sessionMock';
import { RecentSessionCard } from '../components/RecentSessionCard';

/**
 * Dashboard Screen - Main overview screen showing:
 * - Next feed prediction
 * - Current care session (TODO)
 * - Recent care sessions (TODO)
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Next Feed Prediction */}
        <PredictionCard
          prediction={mockPrediction}
          onPress={handlePredictionPress}
        />

        {/* Spacing between cards */}
        <View style={{ height: spacing.md }} />

        {/* Current Care Session */}
        <CurrentSessionCard
          session={mockCurrentSession}
          onPress={handleSessionPress}
        />

        {/* Spacing */}
        <View style={{ height: spacing.md }} />

        {/* Recent Care Sessions Header */}
        <Text style={styles.sectionTitle}>📋 Recent Care Sessions</Text>

        {/* Recent Sessions List */}
        {mockRecentSessions.map((session) => (
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
