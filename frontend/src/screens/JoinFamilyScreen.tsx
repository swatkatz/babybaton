import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMutation } from '@apollo/client/react';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing, typography, layout } from '../theme/spacing';
import deviceService from '../services/deviceService';
import { useAuth } from '../hooks/useAuth';
import { JoinFamilyDocument } from '../types/__generated__/graphql';

type Props = StackScreenProps<RootStackParamList, 'JoinFamily'>;

const QUICK_NAMES = ['Mom', 'Dad', 'Grandma', 'Grandpa', 'Nanny'];

export function JoinFamilyScreen({ navigation }: Props) {
  const { login } = useAuth();
  const familyNameRef = useRef<TextInput>(null);
  const [familyName, setFamilyName] = useState('');
  const [password, setPassword] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [joinFamily, { loading }] = useMutation(JoinFamilyDocument);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!familyName.trim()) {
      newErrors.familyName = 'Family name is required';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }
    if (!caregiverName.trim()) {
      newErrors.caregiverName = 'Your name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleJoinFamily = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const deviceId = await deviceService.getDeviceId();
      const deviceName = await deviceService.getDeviceName();

      const { data } = await joinFamily({
        variables: {
          familyName: familyName.trim(),
          password,
          caregiverName: caregiverName.trim(),
          deviceId,
          deviceName,
        },
      });

      if (data?.joinFamily?.success && data.joinFamily.family && data.joinFamily.caregiver) {
        // Save auth data
        await login({
          familyId: data.joinFamily.family.id,
          caregiverId: data.joinFamily.caregiver.id,
          caregiverName: data.joinFamily.caregiver.name,
          familyName: data.joinFamily.family.name,
          babyName: data.joinFamily.family.babyName,
        });
      } else {
        // Show error and highlight family name field
        const errorMessage = data?.joinFamily?.error || 'Failed to join family';
        Alert.alert('Error', errorMessage);
        setErrors({ ...errors, familyName: errorMessage });
        familyNameRef.current?.focus();
      }
    } catch (error) {
      console.error('Join family error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleQuickName = (name: string) => {
    setCaregiverName(name);
    setErrors({ ...errors, caregiverName: '' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.scrollView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.header}>Join Existing Family</Text>
          <Text style={styles.subheader}>
            Enter your family details to join and start collaborating
          </Text>

          {/* Family Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Family Name</Text>
            <TextInput
              ref={familyNameRef}
              style={[styles.input, errors.familyName && styles.inputError]}
              placeholder="e.g., The Smiths"
              placeholderTextColor={colors.textSecondary}
              value={familyName}
              onChangeText={(text) => {
                setFamilyName(text);
                setErrors({ ...errors, familyName: '' });
              }}
              autoCapitalize="words"
              editable={!loading}
            />
            {errors.familyName && (
              <Text style={styles.errorText}>{errors.familyName}</Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Enter family password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrors({ ...errors, password: '' });
              }}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
            <Text style={styles.hint}>
              Ask your partner for the family password
            </Text>
          </View>

          {/* Your Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Name</Text>

            {/* Quick select chips */}
            <View style={styles.chipsContainer}>
              {QUICK_NAMES.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.chip,
                    caregiverName === name && styles.chipSelected,
                  ]}
                  onPress={() => handleQuickName(name)}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.chipText,
                      caregiverName === name && styles.chipTextSelected,
                    ]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, errors.caregiverName && styles.inputError]}
              placeholder="Or enter custom name"
              placeholderTextColor={colors.textSecondary}
              value={caregiverName}
              onChangeText={(text) => {
                setCaregiverName(text);
                setErrors({ ...errors, caregiverName: '' });
              }}
              autoCapitalize="words"
              editable={!loading}
            />
            {errors.caregiverName && (
              <Text style={styles.errorText}>{errors.caregiverName}</Text>
            )}
          </View>

          {/* Join Button */}
          <TouchableOpacity
            style={[styles.joinButton, loading && styles.joinButtonDisabled]}
            onPress={handleJoinFamily}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.joinButtonText}>Join Family</Text>
            )}
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
  hint: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: layout.radiusRound,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  joinButton: {
    height: 60,
    backgroundColor: colors.primary,
    borderRadius: layout.radiusMedium,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    fontSize: typography.lg,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
