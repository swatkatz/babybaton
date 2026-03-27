import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@apollo/client/react';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing, typography, layout } from '../theme/spacing';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { LinkCaregiverToUserDocument } from '../types/__generated__/graphql';

type Props = StackScreenProps<RootStackParamList, 'Migration'>;

export function MigrationScreen({ navigation }: Props) {
  const { legacyAuthData, clearLegacyAuth, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [linkCaregiver] = useMutation(LinkCaregiverToUserDocument);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleMigrate = async () => {
    if (!validateForm()) return;
    if (!legacyAuthData) {
      Alert.alert('Error', 'No existing account data found.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create Supabase account
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        Alert.alert('Sign Up Failed', signUpError.message);
        return;
      }

      // Step 2: Link old caregiver to new Supabase user
      const { data } = await linkCaregiver({
        variables: { caregiverId: legacyAuthData.caregiverId },
      });

      if (data?.linkCaregiverToUser) {
        // Step 3: Update auth data (keep family data in storage — the app needs it)
        await login({
          familyId: legacyAuthData.familyId,
          caregiverId: data.linkCaregiverToUser.id,
          caregiverName: data.linkCaregiverToUser.name,
          familyName: legacyAuthData.familyName,
          babyName: legacyAuthData.babyName,
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    navigation.navigate('SignIn');
  };

  const handleSkip = async () => {
    // User wants to continue without migrating — keep device auth as is
    navigation.navigate('Dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.header}>Upgrade Your Account</Text>
            <Text style={styles.subheader}>
              Create an account to keep your data safe and access it from any device.
              {legacyAuthData ? ` Your data for ${legacyAuthData.familyName} will be preserved.` : ''}
            </Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrors({ ...errors, email: '' });
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!loading}
              />
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="Minimum 6 characters"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors({ ...errors, password: '' });
                }}
                secureTextEntry
                autoCapitalize="none"
                textContentType="newPassword"
                editable={!loading}
              />
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrors({ ...errors, confirmPassword: '' });
                }}
                secureTextEntry
                autoCapitalize="none"
                textContentType="newPassword"
                editable={!loading}
              />
              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}
            </View>

            {/* Migrate Button */}
            <TouchableOpacity
              style={[styles.migrateButton, loading && styles.buttonDisabled]}
              onPress={handleMigrate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.migrateButtonText}>Create Account & Keep Data</Text>
              )}
            </TouchableOpacity>

            {/* Already have an account */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={handleSignIn}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Skip */}
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
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
  header: {
    fontSize: typography.xxl,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subheader: {
    fontSize: typography.base,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.base,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    height: 56,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.radiusMedium,
    paddingHorizontal: spacing.md,
    fontSize: typography.base,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: typography.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  migrateButton: {
    height: 60,
    backgroundColor: colors.primary,
    borderRadius: layout.radiusMedium,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  migrateButtonText: {
    fontSize: typography.lg,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: typography.base,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  skipButton: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipButtonText: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
});
