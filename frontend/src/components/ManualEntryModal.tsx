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
import { Utensils, Droplets, Moon } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { spacing, typography, layout } from '../theme/spacing';
import { ActivityType, FeedType, SolidsUnit, ActivityInput } from '../types/__generated__/graphql';

export type SelectedActivityType = 'FEED' | 'DIAPER' | 'SLEEP';

interface ManualEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (activities: ActivityInput[]) => void;
  saving: boolean;
  initialActivityType?: SelectedActivityType;
}

export function ManualEntryModal({
  visible,
  onClose,
  onSave,
  saving,
  initialActivityType,
}: ManualEntryModalProps) {
  const [selectedType, setSelectedType] = useState<SelectedActivityType | null>(initialActivityType ?? null);

  useEffect(() => {
    if (visible) {
      setSelectedType(initialActivityType ?? null);
    }
  }, [visible, initialActivityType]);

  // Feed state
  const [feedTime, setFeedTime] = useState(new Date());
  const [feedAmount, setFeedAmount] = useState('');
  const [feedType, setFeedType] = useState<FeedType>(FeedType.Formula);
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState<SolidsUnit | null>(null);

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

  const resetForm = () => {
    setSelectedType(initialActivityType ?? null);
    setFeedTime(new Date());
    setFeedAmount('');
    setFeedType(FeedType.Formula);
    setFoodName('');
    setQuantity('');
    setQuantityUnit(null);
    setDiaperTime(new Date());
    setHadPoop(false);
    setHadPee(true);
    setSleepStartTime(new Date());
    setSleepEndTime(null);
    setHasEndTime(false);
    setErrors({});
    setShowPicker(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (selectedType === 'FEED') {
      if (feedType === FeedType.Solids) {
        if (!foodName.trim()) {
          newErrors.foodName = 'Please enter a food name';
        }
      } else {
        if (!feedAmount.trim() || isNaN(Number(feedAmount)) || Number(feedAmount) <= 0) {
          newErrors.feedAmount = 'Please enter a valid amount in ml';
        }
      }
    }

    if (selectedType === 'DIAPER') {
      if (!hadPoop && !hadPee) {
        newErrors.diaper = 'Please select at least pee or poop';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!selectedType || !validate()) return;

    let activity: ActivityInput;

    switch (selectedType) {
      case 'FEED':
        activity = {
          activityType: ActivityType.Feed,
          feedDetails: feedType === FeedType.Solids
            ? {
                startTime: feedTime.toISOString(),
                feedType: FeedType.Solids,
                foodName: foodName.trim(),
                quantity: quantity.trim() ? Number(quantity) : undefined,
                quantityUnit: quantityUnit ?? undefined,
              }
            : {
                startTime: feedTime.toISOString(),
                amountMl: Number(feedAmount),
                feedType: feedType,
              },
        };
        break;
      case 'DIAPER':
        activity = {
          activityType: ActivityType.Diaper,
          diaperDetails: {
            changedAt: diaperTime.toISOString(),
            hadPoop,
            hadPee,
          },
        };
        break;
      case 'SLEEP':
        activity = {
          activityType: ActivityType.Sleep,
          sleepDetails: {
            startTime: sleepStartTime.toISOString(),
            endTime: hasEndTime && sleepEndTime ? sleepEndTime.toISOString() : undefined,
          },
        };
        break;
    }

    onSave([activity]);
    resetForm();
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

  const renderActivityTypeSelector = () => (
    <View style={styles.typeSelector}>
      <Text style={styles.sectionTitle}>What would you like to log?</Text>
      <View style={styles.typeCards}>
        <TouchableOpacity
          style={[
            styles.typeCard,
            selectedType === 'FEED' && { borderColor: colors.feed, backgroundColor: `${colors.feed}15` },
          ]}
          onPress={() => { setSelectedType('FEED'); setErrors({}); }}
        >
          <View style={[styles.typeIconContainer, { backgroundColor: `${colors.feed}20` }]}>
            <Utensils size={24} color={colors.feed} />
          </View>
          <Text style={[styles.typeCardText, selectedType === 'FEED' && { color: colors.feed }]}>
            Feed
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeCard,
            selectedType === 'DIAPER' && { borderColor: colors.diaper, backgroundColor: `${colors.diaper}15` },
          ]}
          onPress={() => { setSelectedType('DIAPER'); setErrors({}); }}
        >
          <View style={[styles.typeIconContainer, { backgroundColor: `${colors.diaper}20` }]}>
            <Droplets size={24} color={colors.diaper} />
          </View>
          <Text style={[styles.typeCardText, selectedType === 'DIAPER' && { color: colors.diaper }]}>
            Diaper
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeCard,
            selectedType === 'SLEEP' && { borderColor: colors.sleep, backgroundColor: `${colors.sleep}15` },
          ]}
          onPress={() => { setSelectedType('SLEEP'); setErrors({}); }}
        >
          <View style={[styles.typeIconContainer, { backgroundColor: `${colors.sleep}20` }]}>
            <Moon size={24} color={colors.sleep} />
          </View>
          <Text style={[styles.typeCardText, selectedType === 'SLEEP' && { color: colors.sleep }]}>
            Sleep
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleFeedTypeChange = (newFeedType: FeedType) => {
    const wasSolids = feedType === FeedType.Solids;
    const isSolids = newFeedType === FeedType.Solids;
    setFeedType(newFeedType);
    setErrors({});
    if (wasSolids && !isSolids) {
      setFoodName('');
      setQuantity('');
      setQuantityUnit(null);
    } else if (!wasSolids && isSolids) {
      setFeedAmount('');
    }
  };

  const renderSolidsFields = () => (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Food Name</Text>
        <TextInput
          style={[styles.input, errors.foodName && styles.inputError]}
          placeholder="e.g., mushed carrots"
          placeholderTextColor={colors.textLight}
          value={foodName}
          onChangeText={(text) => {
            setFoodName(text);
            setErrors({ ...errors, foodName: '' });
          }}
          editable={!saving}
        />
        {errors.foodName ? (
          <Text style={styles.errorText}>{errors.foodName}</Text>
        ) : null}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Quantity (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 10"
          placeholderTextColor={colors.textLight}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          editable={!saving}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Unit (optional)</Text>
        <View style={styles.chipsContainer}>
          {[SolidsUnit.Spoons, SolidsUnit.Bowls, SolidsUnit.Pieces, SolidsUnit.Portions].map((unit) => (
            <TouchableOpacity
              key={unit}
              style={[styles.chip, quantityUnit === unit && styles.chipSelected]}
              onPress={() => setQuantityUnit(quantityUnit === unit ? null : unit)}
              disabled={saving}
            >
              <Text style={[styles.chipText, quantityUnit === unit && styles.chipTextSelected]}>
                {unit.charAt(0) + unit.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );

  const renderLiquidFields = () => (
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
  );

  const renderFeedForm = () => (
    <View style={styles.formSection}>
      {renderTimePicker('Time', feedTime, setFeedTime, 'feedTime')}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Feed Type</Text>
        <View style={styles.chipsContainer}>
          <TouchableOpacity
            style={[styles.chip, feedType === FeedType.Formula && styles.chipSelected]}
            onPress={() => handleFeedTypeChange(FeedType.Formula)}
            disabled={saving}
          >
            <Text style={[styles.chipText, feedType === FeedType.Formula && styles.chipTextSelected]}>
              Formula
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, feedType === FeedType.BreastMilk && styles.chipSelected]}
            onPress={() => handleFeedTypeChange(FeedType.BreastMilk)}
            disabled={saving}
          >
            <Text style={[styles.chipText, feedType === FeedType.BreastMilk && styles.chipTextSelected]}>
              Breast Milk
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, feedType === FeedType.Solids && styles.chipSelected]}
            onPress={() => handleFeedTypeChange(FeedType.Solids)}
            disabled={saving}
          >
            <Text style={[styles.chipText, feedType === FeedType.Solids && styles.chipTextSelected]}>
              Solids
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {feedType === FeedType.Solids ? renderSolidsFields() : renderLiquidFields()}
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
    switch (selectedType) {
      case 'FEED':
        return renderFeedForm();
      case 'DIAPER':
        return renderDiaperForm();
      case 'SLEEP':
        return renderSleepForm();
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Log Activity</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} disabled={saving}>
              <Text style={styles.closeButtonText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {!initialActivityType && renderActivityTypeSelector()}
            {renderForm()}
          </ScrollView>

          {/* Save Button */}
          {selectedType && (
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
                  <Text style={styles.saveButtonText}>Save Activity</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
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
  typeSelector: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.base,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  typeCards: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: layout.radiusMedium,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  typeCardText: {
    fontSize: typography.sm,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  formSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
