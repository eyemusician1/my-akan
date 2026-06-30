import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { palette, spacing } from '../tokens';

interface YearPromptScreenProps {
  onComplete: () => void;
}

const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior'];

export function YearPromptScreen({ onComplete }: YearPromptScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  // --- SAVE TO LOCAL STORAGE ---
  const handleSubmit = async () => {
    if (selectedYear) {
      try {
        await AsyncStorage.setItem('@user_year', selectedYear);
      } catch (e) {
        console.error("Failed to save year", e);
      }
      onComplete();
    }
  };

  return (
    <View style={[
      styles.container,
      {
        paddingTop: Math.max(insets.top, 40) + spacing.xl,
        paddingBottom: Math.max(insets.bottom, 20) + spacing.lg
      }
    ]}>
      <View style={styles.topSection}>
        <Text style={styles.title}>What year{"\n"}are you in?</Text>

        <Text style={styles.subtitle}>
          This helps Trakn adapt to your academic needs, from early prerequisites to your final requirements.
        </Text>

        <View style={styles.optionsContainer}>
          {YEARS.map((year) => {
            const isSelected = selectedYear === year;
            return (
              <Pressable
                key={year}
                onPress={() => setSelectedYear(year)}
                style={({ pressed }) => [
                  styles.optionCard,
                  isSelected && styles.optionCardActive,
                  pressed && !isSelected && styles.optionCardPressed
                ]}
              >
                <Text style={[
                  styles.optionText,
                  isSelected && styles.optionTextActive
                ]}>
                  {year}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.bottomSection}>
        <Pressable
          disabled={!selectedYear}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.button,
            selectedYear ? styles.buttonActive : styles.buttonDisabled,
            pressed && selectedYear ? styles.buttonPressed : null
          ]}
        >
          <Text style={[
            styles.buttonText,
            selectedYear ? styles.buttonTextActive : styles.buttonTextDisabled
          ]}>
            Finish setup  →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between'
  },
  topSection: {
    flex: 1,
    marginTop: spacing.xl
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: palette.ink,
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: spacing.md
  },
  subtitle: {
    fontSize: 16,
    color: palette.body,
    lineHeight: 24,
    fontWeight: '500',
    paddingRight: spacing.lg,
    marginBottom: spacing.xxl
  },

  // Large Chunky Option Cards
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardActive: {
    backgroundColor: 'rgba(122, 28, 28, 0.1)', // Subtle primary wash
    borderColor: palette.primary,
  },
  optionCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }]
  },
  optionText: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.ink,
    letterSpacing: -0.5,
  },
  optionTextActive: {
    color: palette.primary,
  },

  // Bottom Button Styles
  bottomSection: {
    alignItems: 'flex-end',
    width: '100%'
  },
  button: {
    paddingHorizontal: spacing.xl,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row'
  },
  buttonDisabled: { backgroundColor: '#EAEAEA' },
  buttonActive: { backgroundColor: palette.primary },
  buttonText: { fontSize: 18, fontWeight: '600', letterSpacing: 0.2 },
  buttonTextDisabled: { color: '#8E8E93' },
  buttonTextActive: { color: palette.surface },
  buttonPressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
});