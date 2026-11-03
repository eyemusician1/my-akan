import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {palette} from '../../../tokens';

const UNIT_OPTIONS = [1, 2, 3, 4, 5, 6];

export function UnitSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (units: number) => void;
  disabled?: boolean;
}) {
  const {width, fontScale} = useWindowDimensions();
  const compact = width < 360 || fontScale > 1.3;
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Subject units</Text>
      <View
        style={styles.options}
        accessibilityRole="radiogroup"
        accessibilityLabel="Subject units">
        {UNIT_OPTIONS.map(units => (
          <TouchableOpacity
            key={units}
            accessibilityRole="radio"
            accessibilityLabel={`${units} ${units === 1 ? 'unit' : 'units'}`}
            accessibilityState={{checked: value === units, disabled}}
            disabled={disabled}
            activeOpacity={0.7}
            onPress={() => onChange(units)}
            style={[
              styles.option,
              compact && styles.compactOption,
              value === units && styles.selected,
              disabled && styles.disabled,
            ]}>
            <Text
              style={[styles.value, value === units && styles.selectedValue]}>
              {units}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {marginTop: 4, marginBottom: 8, gap: 10},
  label: {fontSize: 13, fontWeight: '600', color: palette.body},
  options: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  option: {
    flexGrow: 1,
    flexBasis: '13%',
    minWidth: 44,
    minHeight: 44,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  selected: {backgroundColor: palette.primary, borderColor: palette.primary},
  compactOption: {flexBasis: '28%'},
  value: {fontSize: 16, fontWeight: '600', color: palette.ink},
  selectedValue: {color: palette.surface},
  disabled: {opacity: 0.5},
});
