import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { format } from 'date-fns';
import { Utensils, Droplets, Moon } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface ParsedActivity {
  activityType: string;
  feedDetails?: {
    startTime: string;
    endTime?: string;
    amountMl?: number;
    feedType?: string;
    durationMinutes?: number;
  };
  diaperDetails?: {
    changedAt: string;
    hadPoop: boolean;
    hadPee: boolean;
  };
  sleepDetails?: {
    startTime: string;
    endTime?: string;
    durationMinutes?: number;
    isActive?: boolean;
  };
}

interface ActivityConfirmationModalProps {
  visible: boolean;
  rawText: string;
  parsedActivities: ParsedActivity[];
  errors: string[];
  onConfirm: () => void;
  onReRecord: () => void;
  onCancel: () => void;
}

export function ActivityConfirmationModal({
  visible,
  rawText,
  parsedActivities,
  errors,
  onConfirm,
  onReRecord,
  onCancel,
}: ActivityConfirmationModalProps) {
  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch {
      return dateString;
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const renderActivityCard = (activity: ParsedActivity, index: number) => {
    const { activityType, feedDetails, diaperDetails, sleepDetails } = activity;

    let icon: React.ReactElement | null = null;
    let iconBgColor = '';
    let content: React.ReactElement | null = null;

    if (activityType === 'FEED' && feedDetails) {
      icon = <Utensils size={28} color={colors.feed} />;
      iconBgColor = `${colors.feed}20`;
      content = (
        <View>
          <Text style={styles.activityTitle}>Feed</Text>
          <Text style={styles.activityDetail}>
            Time: {formatTime(feedDetails.startTime)}
            {feedDetails.endTime && ` - ${formatTime(feedDetails.endTime)}`}
          </Text>
          {feedDetails.amountMl && (
            <Text style={styles.activityDetail}>Amount: {feedDetails.amountMl}ml</Text>
          )}
          {feedDetails.feedType && (
            <Text style={styles.activityDetail}>
              Type: {feedDetails.feedType.replace('_', ' ').toLowerCase()}
            </Text>
          )}
          {feedDetails.durationMinutes && (
            <Text style={styles.activityDetail}>
              Duration: {formatDuration(feedDetails.durationMinutes)}
            </Text>
          )}
        </View>
      );
    } else if (activityType === 'DIAPER' && diaperDetails) {
      icon = <Droplets size={28} color={colors.diaper} />;
      iconBgColor = `${colors.diaper}20`;
      const types = [];
      if (diaperDetails.hadPee) types.push('pee');
      if (diaperDetails.hadPoop) types.push('poop');
      content = (
        <View>
          <Text style={styles.activityTitle}>Diaper Change</Text>
          <Text style={styles.activityDetail}>
            Time: {formatTime(diaperDetails.changedAt)}
          </Text>
          {types.length > 0 && (
            <Text style={styles.activityDetail}>Type: {types.join(' + ')}</Text>
          )}
        </View>
      );
    } else if (activityType === 'SLEEP' && sleepDetails) {
      icon = <Moon size={28} color={colors.sleep} />;
      iconBgColor = `${colors.sleep}20`;
      content = (
        <View>
          <Text style={styles.activityTitle}>Sleep</Text>
          <Text style={styles.activityDetail}>
            Start: {formatTime(sleepDetails.startTime)}
          </Text>
          {sleepDetails.endTime && (
            <Text style={styles.activityDetail}>
              End: {formatTime(sleepDetails.endTime)}
            </Text>
          )}
          {sleepDetails.durationMinutes && (
            <Text style={styles.activityDetail}>
              Duration: {formatDuration(sleepDetails.durationMinutes)}
            </Text>
          )}
          {sleepDetails.isActive && (
            <Text style={[styles.activityDetail, styles.activeTag]}>Active</Text>
          )}
        </View>
      );
    }

    return (
      <View key={index} style={styles.activityCard}>
        <View style={[styles.activityIconContainer, { backgroundColor: iconBgColor }]}>
          {icon}
        </View>
        <View style={styles.activityContent}>{content}</View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Confirm Activities</Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.scrollContent}>
            {/* Raw Text */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What you said:</Text>
              <View style={styles.rawTextContainer}>
                <Text style={styles.rawText}>"{rawText}"</Text>
              </View>
            </View>

            {/* Errors */}
            {errors && errors.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.errorTitle}>Warnings:</Text>
                {errors.map((error, index) => (
                  <Text key={index} style={styles.errorText}>
                    • {error}
                  </Text>
                ))}
              </View>
            )}

            {/* Parsed Activities */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Parsed activities:</Text>
              {parsedActivities && parsedActivities.length > 0 ? (
                parsedActivities.map((activity, index) =>
                  renderActivityCard(activity, index)
                )
              ) : (
                <View style={styles.noActivitiesContainer}>
                  <Text style={styles.noActivitiesText}>
                    No activities were recognized. Please try again.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.reRecordButton]}
              onPress={onReRecord}
              activeOpacity={0.8}
            >
              <Text style={styles.reRecordButtonText}>Re-record</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                (!parsedActivities || parsedActivities.length === 0) &&
                  styles.confirmButtonDisabled,
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
              disabled={!parsedActivities || parsedActivities.length === 0}
            >
              <Text style={styles.confirmButtonText}>Confirm & Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  rawTextContainer: {
    backgroundColor: '#F5F5F5',
    padding: spacing.md,
    borderRadius: 8,
  },
  rawText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E53935',
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: '#E53935',
    marginBottom: spacing.xs,
  },
  activityCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  activityDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  activeTag: {
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  noActivitiesContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noActivitiesText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  reRecordButton: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  reRecordButtonText: {
    color: '#F57C00',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
