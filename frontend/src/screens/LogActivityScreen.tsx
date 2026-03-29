import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useMutation } from '@apollo/client/react';
import { StackScreenProps } from '@react-navigation/stack';
import { Utensils, Droplets, Moon, Pill, Ruler } from 'lucide-react-native';
import { VoiceInputModal } from '../components/VoiceInputModal';
import { ManualEntryModal, SelectedActivityType } from '../components/ManualEntryModal';
import { ActivityConfirmationModal, ParsedActivity } from '../components/ActivityConfirmationModal';
import { colors } from '../theme/colors';
import { spacing, typography, layout } from '../theme/spacing';
import { HomeStackParamList } from '../navigation/MainTabNavigator';
import {
  AddActivitiesDocument,
  GetCurrentSessionDocument,
  GetBabyStatusDocument,
  ActivityInput,
  FeedDetailsInput,
} from '../types/__generated__/graphql';

type Props = StackScreenProps<HomeStackParamList, 'LogActivity'>;

interface ActivityTypeCard {
  type: SelectedActivityType;
  label: string;
  emoji: string;
  icon: React.ReactElement;
  color: string;
  enabled: boolean;
}

const ACTIVITY_TYPES: (ActivityTypeCard | { label: string; emoji: string; icon: React.ReactElement; color: string; enabled: false })[] = [
  {
    type: 'FEED' as SelectedActivityType,
    label: 'Feed',
    emoji: '\uD83C\uDF7C',
    icon: <Utensils size={28} color={colors.feed} />,
    color: colors.feed,
    enabled: true,
  },
  {
    type: 'DIAPER' as SelectedActivityType,
    label: 'Diaper',
    emoji: '\uD83D\uDCA9',
    icon: <Droplets size={28} color={colors.diaper} />,
    color: colors.diaper,
    enabled: true,
  },
  {
    type: 'SLEEP' as SelectedActivityType,
    label: 'Sleep',
    emoji: '\uD83D\uDE34',
    icon: <Moon size={28} color={colors.sleep} />,
    color: colors.sleep,
    enabled: true,
  },
  {
    label: 'Meds',
    emoji: '\uD83D\uDC8A',
    icon: <Pill size={28} color={colors.textLight} />,
    color: colors.textLight,
    enabled: false,
  },
  {
    label: 'Growth',
    emoji: '\uD83D\uDCCF',
    icon: <Ruler size={28} color={colors.textLight} />,
    color: colors.textLight,
    enabled: false,
  },
];

export function LogActivityScreen({ navigation }: Props) {
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [manualEntryVisible, setManualEntryVisible] = useState(false);
  const [confirmationModalVisible, setConfirmationModalVisible] = useState(false);
  const [parsedResult, setParsedResult] = useState<{
    rawText: string;
    parsedActivities: ParsedActivity[];
    errors: string[];
  } | null>(null);
  const [manualActivityType, setManualActivityType] = useState<SelectedActivityType | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const [addActivities] = useMutation(AddActivitiesDocument, {
    refetchQueries: [
      { query: GetCurrentSessionDocument },
      { query: GetBabyStatusDocument },
    ],
  });

  const handleVoiceParsed = (result: {
    rawText: string;
    parsedActivities: ParsedActivity[];
    errors: string[];
  }) => {
    setParsedResult(result);
    setVoiceModalVisible(false);
    setConfirmationModalVisible(true);
  };

  const handleVoiceConfirm = async () => {
    if (!parsedResult?.parsedActivities?.length) return;

    setSaving(true);
    try {
      // Map to only schema-valid fields (ParsedActivity has extra fields
      // like durationMinutes/isActive that aren't in the GraphQL input types)
      const activities = parsedResult.parsedActivities.map((a) => ({
        activityType: a.activityType as ActivityInput['activityType'],
        feedDetails: a.feedDetails ? {
          startTime: a.feedDetails.startTime,
          endTime: a.feedDetails.endTime,
          amountMl: a.feedDetails.amountMl,
          feedType: a.feedDetails.feedType as FeedDetailsInput['feedType'],
          foodName: a.feedDetails.foodName,
          quantity: a.feedDetails.quantity,
          quantityUnit: a.feedDetails.quantityUnit as FeedDetailsInput['quantityUnit'],
        } : undefined,
        diaperDetails: a.diaperDetails ? {
          changedAt: a.diaperDetails.changedAt,
          hadPoop: a.diaperDetails.hadPoop,
          hadPee: a.diaperDetails.hadPee,
        } : undefined,
        sleepDetails: a.sleepDetails ? {
          startTime: a.sleepDetails.startTime,
          endTime: a.sleepDetails.endTime,
        } : undefined,
      }));

      await addActivities({
        variables: { activities },
      });
      setConfirmationModalVisible(false);
      setParsedResult(null);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save activities. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleVoiceReRecord = () => {
    setConfirmationModalVisible(false);
    setParsedResult(null);
    setVoiceModalVisible(true);
  };

  const handleSwitchToManualEntry = () => {
    setVoiceModalVisible(false);
    setManualActivityType(undefined);
    setManualEntryVisible(true);
  };

  const handleActivityTypePress = (type: SelectedActivityType) => {
    setManualActivityType(type);
    setManualEntryVisible(true);
  };

  const handleManualSave = async (activities: ActivityInput[]) => {
    setSaving(true);
    try {
      await addActivities({
        variables: { activities },
      });
      setManualEntryVisible(false);
      setManualActivityType(undefined);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save activity. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleManualClose = () => {
    setManualEntryVisible(false);
    setManualActivityType(undefined);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Voice Input Section */}
        <View style={styles.voiceSection}>
          <TouchableOpacity
            style={styles.micButton}
            onPress={() => setVoiceModalVisible(true)}
            activeOpacity={0.7}
            testID="mic-button"
          >
            <Text style={styles.micEmoji}>{'\uD83C\uDFA4'}</Text>
          </TouchableOpacity>
          <Text style={styles.voiceTitle}>Tap the microphone to start</Text>
          <View style={styles.examplesContainer}>
            <Text style={styles.examplesTitle}>Examples:</Text>
            <Text style={styles.exampleText}>{'\u2022'} &quot;Fed baby 120ml at 3pm&quot;</Text>
            <Text style={styles.exampleText}>{'\u2022'} &quot;Changed diaper at 4pm, had poop&quot;</Text>
            <Text style={styles.exampleText}>{'\u2022'} &quot;Baby slept from 2pm to 4pm&quot;</Text>
          </View>
        </View>

        {/* Activity Type Grid */}
        <Text style={styles.gridTitle}>Or tap to log:</Text>
        <View style={styles.activityGrid}>
          {ACTIVITY_TYPES.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.activityCard,
                !item.enabled && styles.activityCardDisabled,
              ]}
              onPress={() => {
                if (item.enabled && 'type' in item) {
                  handleActivityTypePress(item.type);
                }
              }}
              disabled={!item.enabled}
              activeOpacity={0.7}
              testID={`activity-card-${item.label.toLowerCase()}`}
            >
              <View style={[styles.activityIconContainer, { backgroundColor: `${item.color}20` }]}>
                {item.icon}
              </View>
              <Text style={[styles.activityCardLabel, !item.enabled && styles.activityCardLabelDisabled]}>
                {item.label}
              </Text>
              {!item.enabled && (
                <Text style={styles.comingSoonText}>Coming soon</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Voice Input Modal */}
      <VoiceInputModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onActivitiesParsed={handleVoiceParsed}
        onSwitchToManualEntry={handleSwitchToManualEntry}
      />

      {/* Activity Confirmation Modal (after voice parsing) */}
      {parsedResult && (
        <ActivityConfirmationModal
          visible={confirmationModalVisible}
          rawText={parsedResult.rawText}
          parsedActivities={parsedResult.parsedActivities}
          errors={parsedResult.errors}
          onConfirm={handleVoiceConfirm}
          onReRecord={handleVoiceReRecord}
          onCancel={() => {
            setConfirmationModalVisible(false);
            setParsedResult(null);
          }}
        />
      )}

      {/* Manual Entry Modal */}
      <ManualEntryModal
        visible={manualEntryVisible}
        onClose={handleManualClose}
        onSave={handleManualSave}
        saving={saving}
        initialActivityType={manualActivityType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  voiceSection: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: layout.radiusLarge,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  micEmoji: {
    fontSize: 40,
  },
  voiceTitle: {
    fontSize: typography.lg,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  examplesContainer: {
    width: '100%',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: layout.radiusMedium,
  },
  examplesTitle: {
    fontSize: typography.sm,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  exampleText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  gridTitle: {
    fontSize: typography.base,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  activityCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityCardDisabled: {
    opacity: 0.5,
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  activityCardLabel: {
    fontSize: typography.sm,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  activityCardLabelDisabled: {
    color: colors.textLight,
  },
  comingSoonText: {
    fontSize: typography.xs,
    color: colors.textLight,
    marginTop: 2,
  },
});
