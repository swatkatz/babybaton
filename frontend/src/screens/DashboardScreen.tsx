// src/screens/DashboardScreen.tsx

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client/react';
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
  GetPredictionDocument,
  GetCurrentSessionDocument,
  GetRecentSessionsDocument,
  AddActivitiesDocument,
} from '../types/__generated__/graphql';

/**
 * Dashboard Screen - Main overview screen showing:
 * - Next feed prediction
 * - Current care session
 * - Recent care sessions
 */
type Props = StackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [confirmationModalVisible, setConfirmationModalVisible] =
    useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);

  const {
    data: predictionData,
    loading: predictionLoading,
    error: predictionError,
  } = useQuery(GetPredictionDocument);

  const {
    data: sessionData,
    loading: sessionLoading,
    error: sessionError,
  } = useQuery(GetCurrentSessionDocument, { pollInterval: 10000 });

  const {
    data: recentSessionsData,
    loading: recentSessionsLoading,
    error: recentSessionsError,
  } = useQuery(GetRecentSessionsDocument, {
    variables: { limit: 3 },
    pollInterval: 30000,
  });

  const [addActivities, { loading: addingActivities }] = useMutation(AddActivitiesDocument);

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

  const handleConfirm = async () => {
    if (!parsedResult || !parsedResult.parsedActivities) {
      return;
    }

    try {
      // Convert ParsedActivity to ActivityInput format
      // Filter out read-only fields that don't exist in input types
      const activities = parsedResult.parsedActivities.map((activity: any) => ({
        activityType: activity.activityType,
        feedDetails: activity.feedDetails ? {
          startTime: activity.feedDetails.startTime,
          endTime: activity.feedDetails.endTime,
          amountMl: activity.feedDetails.amountMl,
          feedType: activity.feedDetails.feedType,
        } : undefined,
        diaperDetails: activity.diaperDetails ? {
          changedAt: activity.diaperDetails.changedAt,
          hadPoop: activity.diaperDetails.hadPoop,
          hadPee: activity.diaperDetails.hadPee,
        } : undefined,
        sleepDetails: activity.sleepDetails ? {
          startTime: activity.sleepDetails.startTime,
          endTime: activity.sleepDetails.endTime,
        } : undefined,
      }));

      const { data } = await addActivities({
        variables: { activities },
        refetchQueries: [{ query: GetCurrentSessionDocument }],
      });

      setConfirmationModalVisible(false);
      setParsedResult(null);

      if (data?.addActivities) {
        Alert.alert('Success', 'Activities saved successfully!');
      }
    } catch (error) {
      console.error('Error saving activities:', error);
      Alert.alert('Error', 'Failed to save activities. Please try again.');
    }
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
