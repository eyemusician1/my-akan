import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import withObservables from '@nozbe/with-observables';
import type Schedule from '../../../core/database/models/Schedule';
import type Subject from '../../../core/database/models/Subject';
import {palette} from '../../../tokens';
import {observeGrades, toGradeBook} from '../data/observations';
import {
  calculateGpa,
  cumulativeScope,
  GpaResult,
  GradeBookTerm,
  gradeFingerprint,
  gradeProgress,
} from '../domain/gpa';
import {TermSelector} from './TermSelector';

interface Actions {
  initialScheduleId?: string;
  autoCalculate?: boolean;
  onLogGrades: (scheduleId?: string) => void;
}
export function GradeCalculatorContent({
  terms,
  initialScheduleId,
  autoCalculate,
  onLogGrades,
}: Actions & {terms: GradeBookTerm[]}) {
  const [mode, setMode] = useState<'semester' | 'cumulative'>('semester');
  const [selectedId, setSelectedId] = useState(initialScheduleId);
  const term = terms.find(item => item.id === selectedId) ?? terms[0];
  const cumulative = useMemo(() => cumulativeScope(terms), [terms]);
  const included =
    mode === 'semester' ? term?.subjects ?? [] : cumulative.subjects;
  const progress = gradeProgress(included);
  const fingerprint = gradeFingerprint(
    `${mode}:${mode === 'semester' ? term?.id : 'all'}`,
    included,
  );
  const [calculation, setCalculation] = useState<{
    fingerprint: string;
    result: GpaResult;
  } | null>(() =>
    autoCalculate && progress.ready
      ? {fingerprint, result: calculateGpa(included)}
      : null,
  );
  const result =
    calculation?.fingerprint === fingerprint ? calculation.result : undefined;
  if (!terms.length)
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No subjects yet</Text>
        <Text style={styles.hint}>Add a schedule from +.</Text>
      </View>
    );
  return (
    <View style={styles.content}>
      <View style={styles.segment}>
        {(['semester', 'cumulative'] as const).map(value => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{selected: mode === value}}
            onPress={() => setMode(value)}
            style={[styles.segmentButton, mode === value && styles.selected]}>
            <Text
              style={[
                styles.segmentText,
                mode === value && styles.selectedText,
              ]}>
              {value === 'semester' ? 'Semester' : 'CGPA'}
            </Text>
          </Pressable>
        ))}
      </View>
      {mode === 'semester' ? (
        <TermSelector
          terms={terms}
          selected={term?.id}
          onSelect={setSelectedId}
        />
      ) : (
        <Text style={styles.hint}>Completed semesters only</Text>
      )}
      {result ? (
        <View style={styles.result} accessibilityLiveRegion="polite">
          <Text style={styles.resultLabel}>
            {mode === 'semester' ? 'Semester GPA' : 'CGPA'}
          </Text>
          <Text style={styles.resultValue}>{result.value.toFixed(2)}</Text>
          <Text style={styles.resultMeta}>
            {mode === 'semester'
              ? `${result.subjects} subjects`
              : `${cumulative.completed.length} ${
                  cumulative.completed.length === 1 ? 'semester' : 'semesters'
                }`}{' '}
            · {result.units} units
          </Text>
          <View style={styles.resultFooter}>
            <Text style={styles.resultMeta}>Weighted by units</Text>
            {result.failed > 0 && (
              <Text style={styles.resultMeta}>
                {result.failed} failed{' '}
                {result.failed === 1 ? 'subject' : 'subjects'}
              </Text>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.readiness}>
          <Text style={styles.readinessTitle}>
            {progress.ready ? 'Ready to calculate' : 'Grades incomplete'}
          </Text>
          <Text style={styles.hint}>
            {mode === 'semester'
              ? `${progress.graded} of ${progress.total} graded`
              : `${cumulative.completed.length} completed ${
                  cumulative.completed.length === 1 ? 'semester' : 'semesters'
                }`}
          </Text>
          {!progress.validWeights && (
            <Text style={styles.hint}>Check subject units.</Text>
          )}
        </View>
      )}
      {mode === 'cumulative' && cumulative.incomplete > 0 && (
        <Text style={styles.hint}>
          {cumulative.incomplete} incomplete{' '}
          {cumulative.incomplete === 1 ? 'semester' : 'semesters'} excluded
        </Text>
      )}
      <Text style={styles.scale}>
        1.00 highest · 3.00 passing · 5.00 failing
      </Text>
      {!result && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Calculate ${
            mode === 'semester' ? 'GPA' : 'CGPA'
          }`}
          accessibilityState={{disabled: !progress.ready}}
          disabled={!progress.ready}
          onPress={() =>
            setCalculation({fingerprint, result: calculateGpa(included)})
          }
          style={[styles.calculate, !progress.ready && styles.disabled]}>
          <Text style={styles.calculateText}>
            Calculate {mode === 'semester' ? 'GPA' : 'CGPA'}
          </Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => onLogGrades(term?.id)}
        style={styles.log}>
        <Text style={styles.logText}>
          {progress.ready ? 'Edit grades' : 'Log grades'}
        </Text>
      </Pressable>
    </View>
  );
}
function GradeCalculatorUI({
  schedules,
  subjects,
  ...actions
}: Actions & {schedules: Schedule[]; subjects: Subject[]}) {
  const terms = useMemo(
    () => toGradeBook(schedules, subjects),
    [schedules, subjects],
  );
  return <GradeCalculatorContent {...actions} terms={terms} />;
}
export const GradeCalculator = withObservables(
  [],
  observeGrades,
)(GradeCalculatorUI);
const styles = StyleSheet.create({
  content: {gap: 20},
  segment: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    padding: 5,
    borderRadius: 24,
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {backgroundColor: palette.ink},
  segmentText: {fontSize: 14, fontWeight: '600', color: palette.body},
  selectedText: {color: palette.surface},
  result: {padding: 26, borderRadius: 30, backgroundColor: palette.primary},
  resultLabel: {fontSize: 14, fontWeight: '600', color: palette.surface},
  resultValue: {
    fontSize: 64,
    fontWeight: '700',
    color: palette.surface,
    marginVertical: 16,
  },
  resultMeta: {fontSize: 12, color: palette.surface},
  resultFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(250,246,239,0.2)',
    marginTop: 22,
    paddingTop: 16,
    gap: 8,
  },
  readiness: {
    padding: 24,
    backgroundColor: palette.surface,
    borderRadius: 26,
    gap: 9,
  },
  readinessTitle: {fontSize: 20, fontWeight: '700', color: palette.ink},
  hint: {fontSize: 12, color: palette.muted, lineHeight: 18},
  scale: {fontSize: 11, color: palette.body, textAlign: 'center'},
  calculate: {
    padding: 18,
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: palette.primary,
  },
  calculateText: {fontSize: 14, fontWeight: '700', color: palette.surface},
  disabled: {opacity: 0.35},
  log: {minHeight: 44, alignItems: 'center', justifyContent: 'center'},
  logText: {fontSize: 13, fontWeight: '600', color: palette.primary},
  empty: {paddingVertical: 50, alignItems: 'center', gap: 10},
  emptyTitle: {fontSize: 20, fontWeight: '700', color: palette.ink},
});
