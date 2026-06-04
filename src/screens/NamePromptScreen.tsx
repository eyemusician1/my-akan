import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable
} from 'react-native';
// CHANGED: Pointing to the index file instead of colors.ts
import { palette, spacing } from '../tokens';

interface NamePromptScreenProps {
  onComplete: (name: string) => void;
}

export function NamePromptScreen({ onComplete }: NamePromptScreenProps) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (name.trim().length > 0) {
      onComplete(name.trim());
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.innerContainer}>

          <View style={styles.topSection}>
            <Text style={styles.title}>What should we call you?</Text>

            <Text style={styles.subtitle}>
              Your name stays entirely on this device. It will be used to personalize your local dashboard and offline reports.
            </Text>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.massiveInput}
                placeholder="e.g. Sayr"
                placeholderTextColor={palette.muted}
                value={name}
                onChangeText={setName}
                autoFocus
                maxLength={20}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                selectionColor={palette.primary}
              />
            </View>
          </View>

          <View style={styles.bottomSection}>
                <Pressable
                    disabled={name.trim().length === 0}
                    onPress={handleSubmit}
                    style={({ pressed }) => [
                    styles.button,
                    name.trim().length > 0 ? styles.buttonActive : styles.buttonDisabled,
                    pressed && name.trim().length > 0 && styles.buttonPressed
                    ]}
                >
                    <Text style={[
                    styles.buttonText,
                    name.trim().length > 0 ? styles.buttonTextActive : styles.buttonTextDisabled
                    ]}>
                    Continue  →
                    </Text>
                </Pressable>
            </View>

        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xxl,
  },
  topSection: {
    flex: 1,
    marginTop: spacing.xl,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: palette.ink,
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 16,
    color: palette.body,
    lineHeight: 24,
    fontWeight: '400',
    paddingRight: spacing.lg,
  },
  inputWrapper: {
    marginTop: spacing.xxl * 1.5,
    borderBottomWidth: 2,
    borderBottomColor: palette.primary,
    paddingBottom: spacing.xs,
  },
  massiveInput: {
    fontSize: 40,
    fontWeight: '700',
    color: palette.ink,
    letterSpacing: -0.5,
    paddingVertical: 0,
  },
  bottomSection: {
    alignItems: 'flex-end',
    width: '100%',
  },
  button: {
    paddingHorizontal: spacing.xl,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonDisabled: {
    backgroundColor: '#EAEAEA',
  },
  buttonActive: {
    backgroundColor: palette.primary,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  buttonTextDisabled: {
    color: '#8E8E93',
  },
  buttonTextActive: {
    color: palette.surface,
  },
    buttonPressed: {
        transform: [{ scale: 0.96 }],
        opacity: 0.9,
    },
});