// src/screens/DashboardScreen.tsx

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { PredictionCard } from '../components/PredictionCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { CurrentSessionCard } from '../components/CurrentSessionCard';
import { RecentSessionCard } from '../components/RecentSessionCard';
import { VoiceInputModal } from '../components/VoiceInputModal';
import { ActivityConfirmationModal } from '../components/ActivityConfirmationModal';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
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
type Props = StackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [confirmationModalVisible, setConfirmationModalVisible] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);

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

  const handlePredictionPress = () => {
    const prediction = predictionData?.predictNextFeed;
    if (prediction) {
      navigation.navigate('PredictionDetail', { prediction });
    }
  };

  const handleSessionPress = () => {
    navigation.navigate('CurrentSessionDetail');
  };

  const handleRecentSessionPress = (sessionId: string) => {
    console.log('Navigating to session:', sessionId);
    navigation.navigate('SessionDetail', { sessionId });
  };

  const handleVoiceButtonPress = () => {
    setVoiceModalVisible(true);
  };

  const handleActivitiesParsed = (result: any) => {
    setParsedResult(result);
    setConfirmationModalVisible(true);
  };

  const handleConfirm = () => {
    // For now, just show a success message
    // Later, this will call the addActivities mutation
    setConfirmationModalVisible(false);
    setParsedResult(null);
    Alert.alert('Success', 'Activities will be saved (coming soon!)');
  };

  const handleReRecord = () => {
    setConfirmationModalVisible(false);
    setParsedResult(null);
    setVoiceModalVisible(true);
  };

  const handleCancel = () => {
    setConfirmationModalVisible(false);
    setParsedResult(null);
  };

  const currentSession = sessionData?.getCurrentSession;
  const recentSessions = recentSessionsData?.getRecentCareSessions ?? [];

  // Convert the prediction (DateTime string -> Date)
  const prediction = predictionData?.predictNextFeed;
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        // Add padding bottom to prevent content from being hidden by sticky button
        style={{ paddingBottom: 80 }}
      >
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

      {/* Sticky Voice Input Button */}
      <TouchableOpacity
        style={styles.voiceButton}
        onPress={handleVoiceButtonPress}
        activeOpacity={0.8}
      >
        <Text style={styles.voiceButtonIcon}>🎤</Text>
        <Text style={styles.voiceButtonText}>Add Activity</Text>
      </TouchableOpacity>

      {/* Voice Input Modal */}
      <VoiceInputModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onActivitiesParsed={handleActivitiesParsed}
      />

      {/* Activity Confirmation Modal */}
      {parsedResult && (
        <ActivityConfirmationModal
          visible={confirmationModalVisible}
          rawText={parsedResult.rawText || ''}
          parsedActivities={parsedResult.parsedActivities || []}
          errors={parsedResult.errors || []}
          onConfirm={handleConfirm}
          onReRecord={handleReRecord}
          onCancel={handleCancel}
        />
      )}
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
    width: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  voiceButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  voiceButtonIcon: {
    fontSize: 28,
    marginRight: spacing.sm,
  },
  voiceButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
