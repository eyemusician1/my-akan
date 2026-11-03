import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import withObservables from '@nozbe/with-observables';
import type Schedule from '../../../core/database/models/Schedule';
import type Subject from '../../../core/database/models/Subject';
import {palette} from '../../../tokens';
import {gradeRepository} from '../data';
import {observeGrades, toGradeBook} from '../data/observations';
import {
  GradeBookSubject,
  GradeBookTerm,
  gradeProgress,
  isValidGrade,
} from '../domain/gpa';
import {GradePicker} from './GradePicker';
import {TermSelector} from './TermSelector';

interface Actions {
  initialScheduleId?: string;
  onCalculate: (scheduleId: string) => void;
}
export function GradeBookContent({
  terms,
  initialScheduleId,
  onCalculate,
  onSaveGrade,
}: Actions & {
  terms: GradeBookTerm[];
  onSaveGrade: (id: string, grade: number | null) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState(initialScheduleId);
  const term = terms.find(item => item.id === selectedId) ?? terms[0];
  const progress = gradeProgress(term?.subjects ?? []);
  const [editing, setEditing] = useState<GradeBookSubject | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const writing = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    setSelectedId(initialScheduleId);
  }, [initialScheduleId]);
  const openPicker = (subject: GradeBookSubject) => {
    if (!writing.current) setEditing(subject);
  };
  const closePicker = () => {
    if (!writing.current) setEditing(null);
  };
  const save = async (grade: number | null) => {
    if (!editing || writing.current) return;
    writing.current = true;
    setSaving(true);
    setPending(grade);
    try {
      await onSaveGrade(editing.id, grade);
      if (mounted.current) setEditing(null);
    } catch (error) {
      if (mounted.current)
        Alert.alert(
          'Grade not saved',
          error instanceof Error ? error.message : 'Please try again.',
        );
    } finally {
      writing.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  if (!term?.subjects.length)
    return (
      <View style={styles.empty}>
        <MaterialIcon name="school" size={34} color={palette.secondary} />
        <Text style={styles.emptyTitle}>No subjects yet</Text>
        <Text style={styles.hint}>Add a schedule from +.</Text>
      </View>
    );
  return (
    <View style={styles.content}>
      <TermSelector terms={terms} selected={term.id} onSelect={setSelectedId} />
      <View>
        <Text style={styles.progressText}>
          {progress.graded} of {progress.total} graded
        </Text>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {width: `${(progress.graded / progress.total) * 100}%`},
            ]}
          />
        </View>
      </View>
      {term.subjects.map(subject => (
        <Pressable
          key={subject.id}
          accessibilityRole="button"
          accessibilityLabel={`Grade for ${subject.code}: ${
            isValidGrade(subject.grade) ? subject.grade.toFixed(2) : 'not set'
          }`}
          onPress={() => openPicker(subject)}
          style={styles.subject}>
          <View style={styles.grow}>
            <Text style={styles.code}>{subject.code}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {subject.title}
            </Text>
            <Text style={styles.units}>{subject.units} units</Text>
          </View>
          <View
            style={[
              styles.gradePill,
              subject.grade === 5 && styles.failedPill,
            ]}>
            <Text
              style={[
                styles.gradeText,
                subject.grade === 5 && styles.failedText,
              ]}>
              {isValidGrade(subject.grade)
                ? subject.grade.toFixed(2)
                : 'Add grade'}
            </Text>
            <MaterialIcon
              name="expand-more"
              size={18}
              color={palette.primary}
            />
          </View>
        </Pressable>
      ))}
      {!progress.validWeights && (
        <Text style={styles.hint}>Check subject units before calculating.</Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{disabled: !progress.ready}}
        disabled={!progress.ready}
        onPress={() => onCalculate(term.id)}
        style={[styles.calculate, !progress.ready && styles.disabled]}>
        <Text style={styles.calculateText}>Calculate GPA</Text>
      </Pressable>
      <GradePicker
        subject={editing}
        saving={saving}
        pending={pending}
        onClose={closePicker}
        onSelect={save}
      />
    </View>
  );
}
const persistGrade = (id: string, grade: number | null) =>
  gradeRepository.saveGrade(id, grade);
function GradeBookUI({
  schedules,
  subjects,
  ...actions
}: Actions & {schedules: Schedule[]; subjects: Subject[]}) {
  const terms = useMemo(
    () => toGradeBook(schedules, subjects),
    [schedules, subjects],
  );
  return (
    <GradeBookContent {...actions} terms={terms} onSaveGrade={persistGrade} />
  );
}
export const GradeBook = withObservables([], observeGrades)(GradeBookUI);
const styles = StyleSheet.create({
  content: {gap: 14},
  grow: {flex: 1},
  empty: {alignItems: 'center', paddingVertical: 45, gap: 12},
  emptyTitle: {fontSize: 18, fontWeight: '700', color: palette.ink},
  hint: {fontSize: 12, color: palette.muted},
  progressText: {fontSize: 12, color: palette.muted, marginBottom: 10},
  track: {
    height: 4,
    backgroundColor: palette.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {height: 4, backgroundColor: palette.primary},
  subject: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    borderRadius: 22,
    backgroundColor: palette.surface,
  },
  code: {fontSize: 16, fontWeight: '700', color: palette.ink},
  title: {fontSize: 12, lineHeight: 18, color: palette.body, marginTop: 4},
  units: {fontSize: 11, color: palette.muted, marginTop: 7},
  gradePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(197,160,89,0.12)',
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 15,
  },
  gradeText: {fontSize: 13, fontWeight: '700', color: palette.primary},
  failedPill: {backgroundColor: 'rgba(179,38,30,0.1)'},
  failedText: {color: '#B3261E'},
  calculate: {
    padding: 17,
    borderRadius: 22,
    backgroundColor: palette.primary,
    alignItems: 'center',
    marginTop: 6,
  },
  calculateText: {fontSize: 14, fontWeight: '700', color: palette.surface},
  disabled: {opacity: 0.35},
});
