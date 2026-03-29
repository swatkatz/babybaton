import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  GetScheduleGoalsDocument,
  UpdateScheduleGoalsDocument,
  ScheduleGoalsInput,
} from '../types/__generated__/graphql';
import { colors } from '../theme/colors';
import { spacing, typography, layout } from '../theme/spacing';

const DEBOUNCE_MS = 500;

function minutesToHours(totalMinutes: number | null | undefined): {
  hours: string;
  minutes: string;
} {
  if (totalMinutes == null) return { hours: '', minutes: '' };
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return { hours: h > 0 ? String(h) : '', minutes: m > 0 ? String(m) : '' };
}

function hoursMinutesToTotal(
  hours: string,
  minutes: string,
): number | null {
  const h = hours === '' ? 0 : parseInt(hours, 10);
  const m = minutes === '' ? 0 : parseInt(minutes, 10);
  if (isNaN(h) && isNaN(m)) return null;
  if (hours === '' && minutes === '') return null;
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function parseTimeString(timeStr: string | null | undefined): Date {
  const date = new Date();
  if (timeStr) {
    const parts = timeStr.split(':');
    date.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}

function formatTimeToHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function ScheduleGoalsScreen() {
  const { data, loading, error } = useQuery(GetScheduleGoalsDocument);
  const [updateGoals] = useMutation(UpdateScheduleGoalsDocument);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPicker, setShowPicker] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);

  const goals = data?.scheduleGoals;

  const [wakeWindowHours, setWakeWindowHours] = useState<string | null>(null);
  const [wakeWindowMinutes, setWakeWindowMinutes] = useState<string | null>(null);
  const [feedIntervalHours, setFeedIntervalHours] = useState<string | null>(null);
  const [feedIntervalMinutes, setFeedIntervalMinutes] = useState<string | null>(null);
  const [napCount, setNapCount] = useState<number | null>(null);
  const [maxNapHours, setMaxNapHours] = useState<string | null>(null);
  const [maxNapMinutes, setMaxNapMinutes] = useState<string | null>(null);
  const [bedtime, setBedtime] = useState<string | null>(null);
  const [wakeTime, setWakeTime] = useState<string | null>(null);

  // Derive display values: local state overrides server data
  const getWakeWindow = () => {
    if (wakeWindowHours !== null || wakeWindowMinutes !== null) {
      return { hours: wakeWindowHours ?? '', minutes: wakeWindowMinutes ?? '' };
    }
    return minutesToHours(goals?.targetWakeWindowMinutes);
  };

  const getFeedInterval = () => {
    if (feedIntervalHours !== null || feedIntervalMinutes !== null) {
      return { hours: feedIntervalHours ?? '', minutes: feedIntervalMinutes ?? '' };
    }
    return minutesToHours(goals?.targetFeedIntervalMinutes);
  };

  const getNapCount = (): number => {
    if (napCount !== null) return napCount;
    return goals?.targetNapCount ?? 0;
  };

  const getMaxNap = () => {
    if (maxNapHours !== null || maxNapMinutes !== null) {
      return { hours: maxNapHours ?? '', minutes: maxNapMinutes ?? '' };
    }
    return minutesToHours(goals?.maxDaytimeNapMinutes);
  };

  const getBedtime = (): string => {
    if (bedtime !== null) return bedtime;
    return goals?.targetBedtime as string ?? '';
  };

  const getWakeTime = (): string => {
    if (wakeTime !== null) return wakeTime;
    return goals?.targetWakeTime as string ?? '';
  };

  const debouncedSave = useCallback(
    (input: ScheduleGoalsInput) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSaveError(false);
      debounceRef.current = setTimeout(async () => {
        try {
          await updateGoals({ variables: { input } });
        } catch {
          setSaveError(true);
        }
      }, DEBOUNCE_MS);
    },
    [updateGoals],
  );

  const buildInput = (overrides: Partial<ScheduleGoalsInput>): ScheduleGoalsInput => {
    const ww = getWakeWindow();
    const fi = getFeedInterval();
    const mn = getMaxNap();
    return {
      targetWakeWindowMinutes: hoursMinutesToTotal(ww.hours, ww.minutes),
      targetFeedIntervalMinutes: hoursMinutesToTotal(fi.hours, fi.minutes),
      targetNapCount: getNapCount() || null,
      maxDaytimeNapMinutes: hoursMinutesToTotal(mn.hours, mn.minutes),
      targetBedtime: getBedtime() || null,
      targetWakeTime: getWakeTime() || null,
      ...overrides,
    };
  };

  const handleDurationChange = (
    field: 'wakeWindow' | 'feedInterval' | 'maxNap',
    part: 'hours' | 'minutes',
    value: string,
  ) => {
    const setters = {
      wakeWindow: { hours: setWakeWindowHours, minutes: setWakeWindowMinutes },
      feedInterval: { hours: setFeedIntervalHours, minutes: setFeedIntervalMinutes },
      maxNap: { hours: setMaxNapHours, minutes: setMaxNapMinutes },
    };
    setters[field][part](value);

    const currentVals = {
      wakeWindow: getWakeWindow,
      feedInterval: getFeedInterval,
      maxNap: getMaxNap,
    };
    const current = currentVals[field]();
    const newHours = part === 'hours' ? value : current.hours;
    const newMinutes = part === 'minutes' ? value : current.minutes;
    const totalMinutes = hoursMinutesToTotal(newHours, newMinutes);

    const inputField = {
      wakeWindow: 'targetWakeWindowMinutes',
      feedInterval: 'targetFeedIntervalMinutes',
      maxNap: 'maxDaytimeNapMinutes',
    } as const;

    debouncedSave(buildInput({ [inputField[field]]: totalMinutes }));
  };

  const handleNapCountChange = (delta: number) => {
    const current = getNapCount();
    const next = Math.max(0, Math.min(10, current + delta));
    setNapCount(next);
    debouncedSave(buildInput({ targetNapCount: next || null }));
  };

  const handleTimeChange = (
    field: 'bedtime' | 'wakeTime',
  ) => (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(null);
    }
    if (selectedDate) {
      const formatted = formatTimeToHHMM(selectedDate);
      if (field === 'bedtime') {
        setBedtime(formatted);
        debouncedSave(buildInput({ targetBedtime: formatted }));
      } else {
        setWakeTime(formatted);
        debouncedSave(buildInput({ targetWakeTime: formatted }));
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Unable to load schedule goals</Text>
        </View>
      </SafeAreaView>
    );
  }

  const wakeWindow = getWakeWindow();
  const feedInterval = getFeedInterval();
  const currentNapCount = getNapCount();
  const maxNap = getMaxNap();
  const currentBedtime = getBedtime();
  const currentWakeTime = getWakeTime();

  const renderDurationField = (
    label: string,
    placeholder: string,
    field: 'wakeWindow' | 'feedInterval' | 'maxNap',
    values: { hours: string; minutes: string },
  ) => (
    <View style={styles.fieldCard}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldPlaceholder}>{placeholder}</Text>
      <View style={styles.durationRow}>
        <View style={styles.durationInput}>
          <TextInput
            style={styles.textInput}
            value={values.hours}
            onChangeText={(v) => handleDurationChange(field, 'hours', v)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textLight}
            accessibilityLabel={`${label} hours`}
          />
          <Text style={styles.durationUnit}>hrs</Text>
        </View>
        <View style={styles.durationInput}>
          <TextInput
            style={styles.textInput}
            value={values.minutes}
            onChangeText={(v) => handleDurationChange(field, 'minutes', v)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textLight}
            accessibilityLabel={`${label} minutes`}
          />
          <Text style={styles.durationUnit}>min</Text>
        </View>
      </View>
    </View>
  );

  const renderTimePicker = (
    label: string,
    placeholder: string,
    field: 'bedtime' | 'wakeTime',
    value: string,
  ) => {
    const dateValue = parseTimeString(value || null);

    if (Platform.OS === 'web') {
      return (
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={styles.fieldPlaceholder}>{placeholder}</Text>
          <input
            type="time"
            value={value || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value;
              if (val) {
                if (field === 'bedtime') {
                  setBedtime(val);
                  debouncedSave(buildInput({ targetBedtime: val }));
                } else {
                  setWakeTime(val);
                  debouncedSave(buildInput({ targetWakeTime: val }));
                }
              }
            }}
            style={{
              height: 48,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: layout.radiusMedium,
              paddingLeft: spacing.sm,
              fontSize: typography.base,
              color: colors.textPrimary,
            }}
          />
        </View>
      );
    }

    if (Platform.OS === 'ios') {
      return (
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={styles.fieldPlaceholder}>{placeholder}</Text>
          <DateTimePicker
            value={dateValue}
            mode="time"
            display="default"
            onChange={handleTimeChange(field)}
            testID={`${field}-picker`}
          />
        </View>
      );
    }

    // Android
    return (
      <View style={styles.fieldCard}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldPlaceholder}>{placeholder}</Text>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowPicker(field)}
          accessibilityLabel={`${label} picker`}
        >
          <Text style={styles.timeButtonText}>
            {value || placeholder}
          </Text>
        </TouchableOpacity>
        {showPicker === field && (
          <DateTimePicker
            value={dateValue}
            mode="time"
            display="default"
            onChange={handleTimeChange(field)}
            testID={`${field}-picker`}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <Text style={styles.headerText}>
            Set your targets and we'll blend them with observed patterns
          </Text>

          {saveError && (
            <Text style={styles.saveErrorText}>
              Failed to save. Changes will retry on next edit.
            </Text>
          )}

          {renderDurationField(
            'Wake Window',
            '2-3 hours',
            'wakeWindow',
            wakeWindow,
          )}

          {renderDurationField(
            'Feed Interval',
            '3-4 hours',
            'feedInterval',
            feedInterval,
          )}

          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Naps Per Day</Text>
            <Text style={styles.fieldPlaceholder}>2-3</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[
                  styles.stepperButton,
                  currentNapCount <= 0 && styles.stepperButtonDisabled,
                ]}
                onPress={() => handleNapCountChange(-1)}
                disabled={currentNapCount <= 0}
                accessibilityLabel="Decrease nap count"
              >
                <Text style={styles.stepperButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{currentNapCount}</Text>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => handleNapCountChange(1)}
                accessibilityLabel="Increase nap count"
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {renderDurationField(
            'Max Daytime Sleep',
            '2-3 hours',
            'maxNap',
            maxNap,
          )}

          {renderTimePicker('Bedtime', '19:00', 'bedtime', currentBedtime)}
          {renderTimePicker('Wake Time', '07:00', 'wakeTime', currentWakeTime)}
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
  headerText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  errorText: {
    fontSize: typography.base,
    color: colors.error,
    textAlign: 'center',
  },
  saveErrorText: {
    fontSize: typography.sm,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  fieldCard: {
    backgroundColor: colors.surface,
    borderRadius: layout.radiusMedium,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: {
    fontSize: typography.lg,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  fieldPlaceholder: {
    fontSize: typography.sm,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  durationInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  textInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.background,
    borderRadius: layout.radiusSmall,
    paddingHorizontal: spacing.sm,
    fontSize: typography.base,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationUnit: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: layout.radiusRound,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  stepperButtonText: {
    fontSize: typography.xl,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  stepperValue: {
    fontSize: typography.xxl,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    minWidth: 40,
    textAlign: 'center',
  },
  timeButton: {
    height: 48,
    backgroundColor: colors.background,
    borderRadius: layout.radiusSmall,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeButtonText: {
    fontSize: typography.base,
    color: colors.textPrimary,
  },
});
