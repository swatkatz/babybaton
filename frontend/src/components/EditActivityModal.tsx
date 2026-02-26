import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { spacing, typography, layout } from '../theme/spacing';
import {
  ActivityInput,
  ActivityType,
  FeedType,
  GetCurrentSessionQuery,
} from '../types/__generated__/graphql';

type CurrentSession = NonNullable<GetCurrentSessionQuery['getCurrentSession']>;
type Activity = CurrentSession['activities'][number];

interface EditActivityModalProps {
  visible: boolean;
  activity: Activity | null;
  onClose: () => void;
  onSave: (activityId: string, input: ActivityInput) => void;
  saving: boolean;
}

export function EditActivityModal({
  visible,
  activity,
  onClose,
  onSave,
  saving,
}: EditActivityModalProps) {
  // Feed state
  const [feedTime, setFeedTime] = useState(new Date());
  const [feedAmount, setFeedAmount] = useState('');
  const [feedType, setFeedType] = useState<FeedType>(FeedType.Formula);

  // Diaper state
  const [diaperTime, setDiaperTime] = useState(new Date());
  const [hadPoop, setHadPoop] = useState(false);
  const [hadPee, setHadPee] = useState(true);

  // Sleep state
  const [sleepStartTime, setSleepStartTime] = useState(new Date());
  const [sleepEndTime, setSleepEndTime] = useState<Date | null>(null);
  const [hasEndTime, setHasEndTime] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Android picker state
  const [showPicker, setShowPicker] = useState<string | null>(null);

  // Populate form with activity data when modal opens
  useEffect(() => {
    if (!activity || !visible) return;

    setErrors({});
    setShowPicker(null);

    switch (activity.__typename) {
      case 'FeedActivity': {
        const details = activity.feedDetails;
        if (details) {
          setFeedTime(new Date(details.startTime));
          setFeedAmount(details.amountMl != null ? String(details.amountMl) : '');
          setFeedType(details.feedType === FeedType.BreastMilk ? FeedType.BreastMilk : FeedType.Formula);
        }
        break;
      }
      case 'DiaperActivity': {
        const details = activity.diaperDetails;
        if (details) {
          setDiaperTime(new Date(details.changedAt));
          setHadPoop(details.hadPoop);
          setHadPee(details.hadPee);
        }
        break;
      }
      case 'SleepActivity': {
        const details = activity.sleepDetails;
        if (details) {
          setSleepStartTime(new Date(details.startTime));
          if (details.endTime) {
            setSleepEndTime(new Date(details.endTime));
            setHasEndTime(true);
          } else {
            setSleepEndTime(null);
            setHasEndTime(false);
          }
        }
        break;
      }
    }
  }, [activity, visible]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (activity?.__typename === 'FeedActivity') {
      if (!feedAmount.trim() || isNaN(Number(feedAmount)) || Number(feedAmount) <= 0) {
        newErrors.feedAmount = 'Please enter a valid amount in ml';
      }
    }

    if (activity?.__typename === 'DiaperActivity') {
      if (!hadPoop && !hadPee) {
        newErrors.diaper = 'Please select at least pee or poop';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!activity || !validate()) return;

    let input: ActivityInput;

    switch (activity.__typename) {
      case 'FeedActivity':
        input = {
          activityType: ActivityType.Feed,
          feedDetails: {
            startTime: feedTime.toISOString(),
            amountMl: Number(feedAmount),
            feedType: feedType,
          },
        };
        break;
      case 'DiaperActivity':
        input = {
          activityType: ActivityType.Diaper,
          diaperDetails: {
            changedAt: diaperTime.toISOString(),
            hadPoop,
            hadPee,
          },
        };
        break;
      case 'SleepActivity':
        input = {
          activityType: ActivityType.Sleep,
          sleepDetails: {
            startTime: sleepStartTime.toISOString(),
            endTime: hasEndTime && sleepEndTime ? sleepEndTime.toISOString() : undefined,
          },
        };
        break;
      default:
        return;
    }

    onSave(activity.id, input);
  };

  const handleTimeChange = (
    setter: (date: Date) => void,
    pickerKey: string,
  ) => (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(null);
    }
    if (selectedDate) {
      setter(selectedDate);
    }
  };

  const toDatetimeLocalValue = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const renderTimePicker = (
    label: string,
    value: Date,
    setter: (date: Date) => void,
    pickerKey: string,
  ) => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{label}</Text>
          <input
            type="datetime-local"
            value={toDatetimeLocalValue(value)}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                setter(new Date(val));
              }
            }}
            style={{
              height: 56,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: colors.border,
              borderRadius: layout.radiusMedium,
              paddingLeft: spacing.md,
              paddingRight: spacing.md,
              fontSize: typography.base,
              color: colors.textPrimary,
              boxSizing: 'border-box' as const,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </View>
      );
    }

    if (Platform.OS === 'ios') {
      return (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{label}</Text>
          <DateTimePicker
            value={value}
            mode="datetime"
            display="default"
            onChange={handleTimeChange(setter, pickerKey)}
            style={styles.dateTimePicker}
          />
        </View>
      );
    }

    // Android: show button that opens picker
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowPicker(pickerKey)}
        >
          <Text style={styles.timeButtonText}>
            {value.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </TouchableOpacity>
        {showPicker === pickerKey && (
          <DateTimePicker
            value={value}
            mode="datetime"
            display="default"
            onChange={handleTimeChange(setter, pickerKey)}
          />
        )}
      </View>
    );
  };

  const renderFeedForm = () => (
    <View style={styles.formSection}>
      {renderTimePicker('Time', feedTime, setFeedTime, 'feedTime')}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Amount (ml)</Text>
        <TextInput
          style={[styles.input, errors.feedAmount && styles.inputError]}
          placeholder="e.g., 120"
          placeholderTextColor={colors.textLight}
          value={feedAmount}
          onChangeText={(text) => {
            setFeedAmount(text);
            setErrors({ ...errors, feedAmount: '' });
          }}
          keyboardType="numeric"
          editable={!saving}
        />
        {errors.feedAmount ? (
          <Text style={styles.errorText}>{errors.feedAmount}</Text>
        ) : null}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Feed Type</Text>
        <View style={styles.chipsContainer}>
          <TouchableOpacity
            style={[styles.chip, feedType === FeedType.Formula && styles.chipSelected]}
            onPress={() => setFeedType(FeedType.Formula)}
            disabled={saving}
          >
            <Text style={[styles.chipText, feedType === FeedType.Formula && styles.chipTextSelected]}>
              Formula
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, feedType === FeedType.BreastMilk && styles.chipSelected]}
            onPress={() => setFeedType(FeedType.BreastMilk)}
            disabled={saving}
          >
            <Text style={[styles.chipText, feedType === FeedType.BreastMilk && styles.chipTextSelected]}>
              Breast Milk
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderDiaperForm = () => (
    <View style={styles.formSection}>
      {renderTimePicker('Time', diaperTime, setDiaperTime, 'diaperTime')}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.togglesContainer}>
          <TouchableOpacity
            style={[styles.toggle, hadPee && styles.toggleActive]}
            onPress={() => setHadPee(!hadPee)}
            disabled={saving}
          >
            <Text style={[styles.toggleText, hadPee && styles.toggleTextActive]}>
              Pee
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggle, hadPoop && styles.toggleActive]}
            onPress={() => setHadPoop(!hadPoop)}
            disabled={saving}
          >
            <Text style={[styles.toggleText, hadPoop && styles.toggleTextActive]}>
              Poop
            </Text>
          </TouchableOpacity>
        </View>
        {errors.diaper ? (
          <Text style={styles.errorText}>{errors.diaper}</Text>
        ) : null}
      </View>
    </View>
  );

  const renderSleepForm = () => (
    <View style={styles.formSection}>
      {renderTimePicker('Start Time', sleepStartTime, setSleepStartTime, 'sleepStart')}

      <View style={styles.inputGroup}>
        <TouchableOpacity
          style={[styles.toggle, hasEndTime && styles.toggleActive]}
          onPress={() => {
            const next = !hasEndTime;
            setHasEndTime(next);
            if (next && !sleepEndTime) {
              setSleepEndTime(new Date());
            }
          }}
          disabled={saving}
        >
          <Text style={[styles.toggleText, hasEndTime && styles.toggleTextActive]}>
            Set End Time
          </Text>
        </TouchableOpacity>
        {!hasEndTime && (
          <Text style={styles.hint}>Leave blank if baby is still sleeping</Text>
        )}
      </View>

      {hasEndTime && sleepEndTime && (
        renderTimePicker('End Time', sleepEndTime, setSleepEndTime, 'sleepEnd')
      )}
    </View>
  );

  const renderForm = () => {
    if (!activity) return null;

    switch (activity.__typename) {
      case 'FeedActivity':
        return renderFeedForm();
      case 'DiaperActivity':
        return renderDiaperForm();
      case 'SleepActivity':
        return renderSleepForm();
      default:
        return null;
    }
  };

  const getTitle = () => {
    if (!activity) return 'Edit Activity';
    switch (activity.__typename) {
      case 'FeedActivity':
        return 'Edit Feed';
      case 'DiaperActivity':
        return 'Edit Diaper Change';
      case 'SleepActivity':
        return 'Edit Sleep';
      default:
        return 'Edit Activity';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{getTitle()}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={saving}>
              <Text style={styles.closeButtonText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {renderForm()}
          </ScrollView>

          {/* Save Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    fontSize: typography.xl,
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
    flexGrow: 1,
    flexShrink: 1,
  },
  formSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sm,
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
    fontSize: typography.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  hint: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  togglesContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: layout.radiusMedium,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  dateTimePicker: {
    alignSelf: 'flex-start',
  },
  timeButton: {
    height: 56,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.radiusMedium,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  timeButtonText: {
    fontSize: typography.base,
    color: colors.textPrimary,
  },
  buttonContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveButton: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: layout.radiusMedium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: typography.base,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
