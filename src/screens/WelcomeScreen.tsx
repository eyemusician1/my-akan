import React from 'react';
import { StyleSheet, Text, View, Pressable, ImageBackground, Image } from 'react-native';
// CHANGED: Pointing to the index file instead of colors.ts
import { palette, spacing } from '../tokens';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <ImageBackground
      source={require('../../assets/images/loginBG.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>

        {/* Top Header Section */}
        <View style={styles.headerContainer}>
          <Image
            source={require('../../assets/images/msuLogo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Trakn</Text>
        </View>

        {/* Centered Hero Section */}
        <View style={styles.contentContainer}>
          <Text style={styles.headlineWhite}>Own your schedule.</Text>
          <Text style={styles.headlineGold}>Track it offline.</Text>

          <Text style={styles.subtitle}>
            Scan your COR to instantly build a smart timeline. Track subjects, rooms, and dues anywhere—no internet required.
          </Text>
        </View>

        {/* Bottom Action Section */}
        <View style={styles.actionContainer}>
          <Pressable
            onPress={onGetStarted}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed
            ]}
          >
            <Text style={styles.buttonText}>Get started</Text>
          </Pressable>
        </View>

      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 1.5,
    paddingBottom: spacing.xxl,
  },

  // Header Styles
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 28,
    height: 28,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: palette.surface,
    letterSpacing: -0.5,
  },

  // Centered Content Styles
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  headlineWhite: {
    fontSize: 48,
    fontWeight: '700',
    color: palette.surface,
    letterSpacing: -1.5,
    textAlign: 'center',
    lineHeight: 52,
  },
  headlineGold: {
    fontSize: 48,
    fontWeight: '700',
    color: palette.secondary,
    letterSpacing: -1.5,
    textAlign: 'center',
    lineHeight: 52,
    marginBottom: spacing.xl,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 28,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },

  // Action Button Styles
  actionContainer: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: spacing.md,
  },
  button: {
    backgroundColor: palette.ink,
    paddingHorizontal: 48,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  buttonText: {
    color: palette.surface,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.25,
  },
});