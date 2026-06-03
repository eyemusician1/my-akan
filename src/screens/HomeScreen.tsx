import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {palette, spacing, typography} from '../tokens';

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.sub}>Start building your first screen.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    color: palette.ink,
    fontSize: 30,
    marginBottom: spacing.sm,
    fontFamily: typography.serif,
  },
  sub: {
    color: palette.body,
    fontSize: 18,
  },
});
