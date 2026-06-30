import React from 'react';
import { StyleSheet, Text, View, Pressable, Image, ImageBackground, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, spacing } from '../tokens';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={require('../../assets/images/loginbg9.png')}
      style={styles.background}
      resizeMode="cover"
    >
      {/* FIX: The StatusBar must be inside the return statement to work!
        This forces the time/battery icons to be white and transparent.
      */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/*
        This overlay darkens the background image slightly.
        It is the industry standard way to guarantee text readability!
      */}
      <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 40) + spacing.xl }]}>

        {/* Top Header Section */}
        <View style={styles.headerContainer}>
          <Image
            source={require('../../assets/images/msuLogo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Trakn</Text>
        </View>

        {/* Left-Aligned Minimalist Hero Section */}
        <View style={styles.contentContainer}>
          <Text style={styles.headline}>Own your schedule.</Text>
          <Text style={[styles.headline, styles.headlineHighlight]}>Track it offline.</Text>

          <Text style={styles.subtitle}>
            Scan your COR to instantly build a smart timeline. Track subjects, rooms, and dues anywhere—no internet required.
          </Text>
        </View>

        {/* Prominent Bottom Action Section */}
        <View style={[styles.actionContainer, { paddingBottom: Math.max(insets.bottom, 20) + spacing.lg }]}>
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
  // Contrast protector overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: spacing.xl,
  },

  // Header Styles
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 32,
    height: 32,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.surface, // Kept white to pop against the dark background
    letterSpacing: -0.5,
  },

  // Left-Aligned Content Styles
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headline: {
    fontSize: 46,
    fontWeight: '800',
    color: palette.surface,
    letterSpacing: -1.5,
    lineHeight: 52,
  },
  headlineHighlight: {
    color: palette.secondary, // Warm gold/secondary color from your palette
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 26,
    fontWeight: '500',
    paddingRight: spacing.xl,
  },

  // Action Button Styles
  actionContainer: {
    width: '100%',
  },
  button: {
    width: '100%',
    backgroundColor: palette.surface, // Clean white button
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  buttonText: {
    color: palette.ink, // Dark text on the white button
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});