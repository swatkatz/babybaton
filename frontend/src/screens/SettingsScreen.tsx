import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Clipboard,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing, typography, layout } from '../theme/spacing';
import { useQuery } from '@apollo/client/react';
import { GET_FAMILY_SETTINGS } from '../graphql/queries';
import { useAuth } from '../hooks/useAuth';

type Props = StackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { authData, logout } = useAuth();
  const { data, loading, error } = useQuery(GET_FAMILY_SETTINGS);

  const handleCopyPassword = () => {
    if (data?.getMyFamily?.password) {
      Clipboard.setString(data.getMyFamily.password);
      Alert.alert('Copied!', 'Password copied to clipboard');
    }
  };

  const handleLeaveFamily = () => {
    Alert.alert(
      'Leave Family',
      'This feature will be available soon. You will be able to leave the family and create or join a different one.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data?.getMyFamily) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Unable to load family settings</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const family = data.getMyFamily;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Family Info Section */}
          <View style={styles.section}>
            <Text style={styles.infoLabel}>Family</Text>
            <Text style={styles.infoValue}>{family.name}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.infoLabel}>Baby</Text>
            <Text style={styles.infoValue}>{family.babyName}</Text>
          </View>

          <View style={styles.divider} />

          {/* Share Access Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Share Access</Text>
            <Text style={styles.shareDescription}>
              Share these details with other caregivers to join your family
            </Text>

            <View style={styles.shareItem}>
              <Text style={styles.shareLabel}>Family Name</Text>
              <Text style={styles.shareValue}>{family.name}</Text>
            </View>

            <View style={styles.shareItem}>
              <Text style={styles.shareLabel}>Password</Text>
              <View style={styles.passwordRow}>
                <Text style={styles.shareValue}>{family.password}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopyPassword}
                >
                  <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Caregivers Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Caregivers ({family.caregivers.length})
            </Text>

            <View style={styles.caregiverList}>
              {family.caregivers.map((caregiver) => (
                <View key={caregiver.id} style={styles.caregiverItem}>
                  <Text style={styles.caregiverBullet}>•</Text>
                  <View style={styles.caregiverInfo}>
                    <Text style={styles.caregiverName}>{caregiver.name}</Text>
                    {caregiver.deviceName && (
                      <Text style={styles.caregiverDevice}>
                        ({caregiver.deviceName})
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Leave Family Button */}
          <TouchableOpacity
            style={styles.leaveFamilyButton}
            onPress={handleLeaveFamily}
          >
            <Text style={styles.leaveFamilyButtonText}>Leave Family</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: spacing.lg,
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: typography.base,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: layout.radiusMedium,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.base,
    fontWeight: '600' as const,
  },
  section: {
    marginBottom: spacing.lg,
  },
  infoLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: typography.xl,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  shareDescription: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  shareItem: {
    marginBottom: spacing.md,
  },
  shareLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  shareValue: {
    fontSize: typography.base,
    color: colors.textPrimary,
    fontWeight: '500' as const,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  copyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: layout.radiusSmall,
  },
  copyButtonText: {
    fontSize: typography.sm,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  caregiverList: {
    gap: spacing.sm,
  },
  caregiverItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  caregiverBullet: {
    fontSize: typography.lg,
    color: colors.textPrimary,
    lineHeight: typography.lg * 1.2,
  },
  caregiverInfo: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  caregiverName: {
    fontSize: typography.base,
    color: colors.textPrimary,
    fontWeight: '500' as const,
  },
  caregiverDevice: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  leaveFamilyButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: layout.radiusMedium,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  leaveFamilyButtonText: {
    fontSize: typography.base,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
