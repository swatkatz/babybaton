import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StackHeaderProps } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@apollo/client/react';
import { Plus, Calendar } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { spacing } from '../theme/spacing';
import { colors } from '../theme/colors';
import { GetPredictionDocument } from '../types/__generated__/graphql';
import predictionReadService from '../services/predictionReadService';

const ICON_SIZE = 24;

export function CustomHeader({ options, route, navigation }: StackHeaderProps) {
  const { authData } = useAuth();
  const insets = useSafeAreaInsets();

  const isDashboard = route.name === 'Dashboard';

  const { data: predictionData } = useQuery(GetPredictionDocument, {
    skip: !isDashboard,
  });

  const predictedTime = predictionData?.predictNextFeed?.predictedTime ?? null;

  const [hasUnread, setHasUnread] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isDashboard) {
        predictionReadService.hasAnyUnread(predictedTime).then(setHasUnread);
      }
    }, [isDashboard, predictedTime])
  );

  const showBadge = hasUnread;

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleLogActivity = () => {
    navigation.navigate('LogActivity');
  };

  const handleUpcoming = () => {
    navigation.navigate('Upcoming');
  };

  // Get the title from route options or use baby name
  const showBabyName = isDashboard;
  const canGoBack = navigation.canGoBack();
  const title =
    showBabyName && authData?.babyName
      ? `${authData.babyName}'s Baton`
      : options.title || route.name;

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Left side: [+] on Dashboard, back button on other screens */}
        <View style={styles.sideContainer}>
          {isDashboard ? (
            <TouchableOpacity
              onPress={handleLogActivity}
              style={styles.iconButton}
              activeOpacity={0.7}
              testID="log-activity-button"
              accessibilityLabel="Log Activity"
            >
              <Plus size={ICON_SIZE} color={colors.surface} />
            </TouchableOpacity>
          ) : canGoBack ? (
            <TouchableOpacity
              onPress={handleBackPress}
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Title (centered) */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {showBabyName && '🍼  '}
            {title}
          </Text>
        </View>

        {/* Right side: [🗓️] on Dashboard */}
        <View style={styles.sideContainer}>
          {isDashboard && (
            <TouchableOpacity
              onPress={handleUpcoming}
              style={styles.iconButton}
              activeOpacity={0.7}
              testID="upcoming-button"
              accessibilityLabel="Upcoming"
            >
              <Calendar size={ICON_SIZE} color={colors.surface} />
              {showBadge && <View style={styles.badge} testID="upcoming-badge" />}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: spacing.md,
  },
  sideContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: colors.surface,
    fontWeight: '300' as const,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: colors.surface,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
});
