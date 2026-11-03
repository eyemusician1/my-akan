import React, {forwardRef, useState} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {palette} from '../../../tokens';
import {maskClockInput, parseClockField, TimePeriod} from '../domain/time';

interface Props {
  label: string;
  value: string;
  period: TimePeriod;
  onChange: (value: string) => void;
  onPeriodChange: (period: TimePeriod) => void;
  onSubmit?: () => void;
  onComplete?: () => void;
  disabled?: boolean;
}

export const TimeField = forwardRef<TextInput, Props>(function TimeField(
  {
    label,
    value,
    period,
    onChange,
    onPeriodChange,
    onSubmit,
    onComplete,
    disabled,
  },
  ref,
) {
  const [touched, setTouched] = useState(false);
  const parsed = parseClockField(value, period);
  const error =
    (touched || value.length === 5) && value.trim() && !parsed.valid
      ? parsed.error
      : '';
  const normalize = () => {
    setTouched(true);
    if (parsed.valid) {
      onChange(parsed.time);
      if (parsed.period !== period) onPeriodChange(parsed.period);
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.wrapper, !!error && styles.invalid]}>
        <TextInput
          ref={ref}
          value={value}
          style={styles.input}
          accessibilityLabel={`${label} time`}
          accessibilityHint="Enter four digits for hours and minutes"
          onChangeText={text => {
            const masked = maskClockInput(text, value);
            const result = parseClockField(masked, period);
            onChange(result.valid ? result.time : masked);
            const hour = Number(masked.split(':')[0]);
            if (result.valid && (hour === 0 || hour > 12))
              onPeriodChange(result.period);
            if (result.valid && masked.length === 5 && value.length < 5)
              onComplete?.();
          }}
          onBlur={normalize}
          onSubmitEditing={() => {
            normalize();
            if (parsed.valid) onSubmit?.();
          }}
          placeholder={label === 'Starts' ? '08:00' : '05:00'}
          placeholderTextColor={palette.muted}
          keyboardType="number-pad"
          autoCorrect={false}
          autoCapitalize="characters"
          maxLength={5}
          editable={!disabled}
          returnKeyType={onSubmit ? 'next' : 'done'}
          blurOnSubmit={!onSubmit}
        />
        <TouchableOpacity
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`${label} period ${
            parsed.valid ? parsed.period : period
          }`}
          style={styles.period}
          onPress={() => {
            if (parsed.valid) onChange(parsed.time);
            const current = parsed.valid ? parsed.period : period;
            onPeriodChange(current === 'AM' ? 'PM' : 'AM');
          }}>
          <Text style={styles.periodText}>
            {parsed.valid ? parsed.period : period}
          </Text>
        </TouchableOpacity>
      </View>
      {!!error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {flex: 1},
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.muted,
    marginBottom: 8,
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingLeft: 12,
  },
  invalid: {borderColor: '#B3261E'},
  input: {
    flex: 1,
    minWidth: 0,
    height: 60,
    fontSize: 19,
    fontWeight: '600',
    color: palette.ink,
    paddingVertical: 8,
  },
  period: {paddingHorizontal: 10, height: 52, justifyContent: 'center'},
  periodText: {fontSize: 13, fontWeight: '700', color: palette.primary},
  error: {fontSize: 11, lineHeight: 16, color: '#B3261E', marginTop: 5},
});
