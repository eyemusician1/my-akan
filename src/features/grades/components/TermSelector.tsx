import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text} from 'react-native';
import {palette} from '../../../tokens';
import type {GradeBookTerm} from '../domain/gpa';

export function TermSelector({
  terms,
  selected,
  onSelect,
}: {
  terms: GradeBookTerm[];
  selected?: string;
  onSelect: (id: string) => void;
}) {
  if (terms.length === 1)
    return <Text style={styles.title}>{terms[0].academicTerm}</Text>;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {terms.map(term => (
        <Pressable
          key={term.id}
          accessibilityRole="button"
          accessibilityState={{selected: term.id === selected}}
          onPress={() => onSelect(term.id)}
          style={[styles.chip, term.id === selected && styles.active]}>
          <Text
            style={[styles.label, term.id === selected && styles.activeLabel]}>
            {term.academicTerm}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  title: {fontSize: 18, fontWeight: '700', color: palette.ink},
  row: {gap: 8},
  chip: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: palette.border,
  },
  active: {backgroundColor: palette.ink, borderColor: palette.ink},
  label: {fontSize: 13, color: palette.body},
  activeLabel: {color: palette.surface},
});
