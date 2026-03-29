// src/screens/DashboardScreen.tsx

import React from 'react';
import { View, ScrollView, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useQuery } from '@apollo/client/react';
import { StatusSummary } from '../components/StatusSummary';
import { ActivityGrid } from '../components/ActivityGrid';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/spacing';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { formatTime } from '../utils/time';
import { StackScreenProps } from '@react-navigation/stack';
import { HomeStackParamList } from '../navigation/MainTabNavigator';
import {
  GetCurrentSessionDocument,
  GetBabyStatusDocument,
} from '../types/__generated__/graphql';

/**
 * Dashboard Screen - Main overview screen showing:
 * - Baby status summary (last feed, sleep, diaper)
 * - Current session header + activity grid
 */
type Props = StackScreenProps<HomeStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  // Re-render every 30s for relative time freshness
  useAutoRefresh(30_000);

  const { data: statusData } = useQuery(GetBabyStatusDocument, {
    pollInterval: 60_000,
  });

  const {
    data: sessionData,
    loading: sessionLoading,
  } = useQuery(GetCurrentSessionDocument, { pollInterval: 10000 });

  const currentSession = sessionData?.getCurrentSession;

  const handleSeeAll = () => {
    navigation.navigate('CurrentSessionDetail');
  };

  const handleActivityPress = (_activityId: string) => {
    navigation.navigate('CurrentSessionDetail');
  };

  const isLoading = sessionLoading && !sessionData;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Baby Status Summary */}
        {statusData?.getBabyStatus && (
          <StatusSummary status={statusData.getBabyStatus} />
        )}

        {/* Current Session */}
        {currentSession ? (
          <View style={styles.sessionSection}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionTitle}>{currentSession.caregiver.name}</Text>
              <Text style={styles.sessionSubtitle}>
                Started {formatTime(new Date(currentSession.startedAt))}
              </Text>
            </View>
            <ActivityGrid
              activities={currentSession.activities}
              onActivityPress={handleActivityPress}
              onSeeAll={handleSeeAll}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active session</Text>
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
  content: {
    padding: spacing.md,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  sessionSection: {
    marginTop: spacing.md,
  },
  sessionHeader: {
    marginBottom: spacing.sm,
  },
  sessionTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sessionSubtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
});
