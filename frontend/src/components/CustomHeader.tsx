import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StackHeaderProps } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaregiverAvatar } from './CaregiverAvatar';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function CustomHeader({ options, route, navigation }: StackHeaderProps) {
  const { authData } = useAuth();
  const insets = useSafeAreaInsets();

  const handleAvatarPress = () => {
    navigation.navigate('Settings' as never);
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  // Get the title from route options or use baby name
  const showBabyName = route.name === 'Dashboard';
  const canGoBack = navigation.canGoBack();
  const title =
    showBabyName && authData?.babyName
      ? `${authData.babyName}'s Baton`
      : options.title || route.name;

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Back Button */}
        {canGoBack && (
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        )}

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {showBabyName && '🍼  '}
            {title}
          </Text>
        </View>

        {/* Avatar */}
        {authData && (
          <View style={styles.avatarContainer}>
            <CaregiverAvatar
              caregiverId={authData.caregiverId}
              caregiverName={authData.caregiverName}
              size={36}
              onPress={handleAvatarPress}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#5B9BD5',
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
  backButton: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  backButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300' as const,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  avatarContainer: {
    marginLeft: spacing.sm,
  },
});
