import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing, typography, layout } from '../theme/spacing';

type Props = StackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Text style={styles.logoIcon}>🍼</Text>
          <Text style={styles.title}>Baby Baton</Text>
          <Text style={styles.subtitle}>
            Track feedings, diapers, and sleep together
          </Text>
        </View>

        {/* Buttons Section */}
        <View style={styles.buttonsSection}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => navigation.navigate('SignUp')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('SignIn')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Device Auth Section */}
        <View style={styles.deviceAuthSection}>
          <Text style={styles.deviceAuthText}>
            Or continue without an account
          </Text>
          <View style={styles.deviceAuthButtons}>
            <TouchableOpacity
              style={styles.deviceAuthButton}
              onPress={() => navigation.navigate('CreateFamily')}
              activeOpacity={0.8}
            >
              <Text style={styles.deviceAuthButtonText}>Create Family</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deviceAuthButton}
              onPress={() => navigation.navigate('JoinFamily')}
              activeOpacity={0.8}
            >
              <Text style={styles.deviceAuthButtonText}>Join Family</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Share baby care duties with your partner
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 80,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: '700' as const,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  buttonsSection: {
    gap: spacing.md,
  },
  button: {
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: typography.lg,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    fontSize: typography.lg,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  deviceAuthSection: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  deviceAuthText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  deviceAuthButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deviceAuthButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: layout.radiusRound,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceAuthButtonText: {
    fontSize: typography.sm,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  footer: {
    fontSize: typography.sm,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
