import {ScreenModal as Modal} from '../../../shared/components/ScreenModal';
import React, {useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {palette} from '../../../tokens';
import {
  enterBottomSheet,
  exitBottomSheet,
  SHEET_CLOSED_OFFSET,
} from '../../../shared/animations/bottomSheet';
import {GRADE_VALUES, GradeBookSubject, isValidGrade} from '../domain/gpa';

export function GradePicker({
  subject,
  saving,
  pending,
  onClose,
  onSelect,
}: {
  subject: GradeBookSubject | null;
  saving: boolean;
  pending: number | null;
  onClose: () => void;
  onSelect: (grade: number | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SHEET_CLOSED_OFFSET)).current;
  const [retainedSubject, setRetainedSubject] = useState(subject);
  const currentSubject = useRef(subject);
  const presented = useRef(!!subject);
  currentSubject.current = subject;
  const [reduceMotion, setReduceMotion] = useState(false);
  const displayedSubject = subject ?? retainedSubject;
  const blocked = saving || !subject;
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    if (subject) {
      presented.current = true;
      setRetainedSubject(subject);
      if (reduceMotion) {
        opacity.setValue(1);
        translateY.setValue(0);
      } else {
        animation = enterBottomSheet(opacity, translateY);
        animation.start();
      }
    } else if (presented.current) {
      const finish = () => {
        if (!currentSubject.current) {
          presented.current = false;
          setRetainedSubject(null);
        }
      };
      if (reduceMotion) finish();
      else {
        animation = exitBottomSheet(opacity, translateY);
        animation.start(({finished}) => {
          if (finished) finish();
        });
      }
    }
    // Cancel an old exit before reopening so it cannot hide the next subject.
    return () => animation?.stop();
  }, [subject, reduceMotion, opacity, translateY]);
  return (
    <Modal
      visible={!!displayedSubject}
      transparent
      animationType="none"
      hardwareAccelerated
      onRequestClose={() => {
        if (!blocked) onClose();
      }}>
      <View style={styles.overlay}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, styles.backdrop, {opacity}]}
        />
        <Pressable
          style={StyleSheet.absoluteFillObject}
          disabled={blocked}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close grade picker"
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + 24,
              transform: [{translateY}],
            },
          ]}>
          <View style={styles.header}>
            <Text style={styles.code}>{displayedSubject?.code}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close grades"
              disabled={blocked}
              onPress={onClose}
              hitSlop={10}>
              <MaterialIcon name="close" size={24} color={palette.body} />
            </Pressable>
          </View>
          <Text style={styles.title}>{displayedSubject?.title}</Text>
          <View style={styles.grid}>
            {GRADE_VALUES.map(grade => (
              <Pressable
                key={grade}
                accessibilityRole="button"
                accessibilityLabel={`Set grade ${grade.toFixed(2)}`}
                accessibilityState={{
                  selected: displayedSubject?.grade === grade,
                  disabled: blocked,
                }}
                disabled={blocked}
                onPress={() => onSelect(grade)}
                style={[
                  styles.grade,
                  displayedSubject?.grade === grade && styles.selected,
                ]}>
                {saving && pending === grade ? (
                  <ActivityIndicator
                    color={
                      displayedSubject?.grade === grade
                        ? palette.surface
                        : palette.primary
                    }
                  />
                ) : (
                  <Text
                    style={[
                      styles.gradeText,
                      displayedSubject?.grade === grade && styles.selectedText,
                    ]}>
                    {grade.toFixed(2)}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>
            1.00 highest · 3.00 passing · 5.00 failing
          </Text>
          {isValidGrade(displayedSubject?.grade) && (
            <Pressable
              accessibilityRole="button"
              disabled={blocked}
              onPress={() => onSelect(null)}
              style={styles.clear}>
              {saving && pending === null ? (
                <ActivityIndicator color={palette.primary} />
              ) : (
                <Text style={styles.clearText}>Clear grade</Text>
              )}
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {backgroundColor: 'rgba(0,0,0,0.5)'},
  sheet: {
    backgroundColor: palette.bg,
    padding: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  code: {fontSize: 22, fontWeight: '700', color: palette.ink},
  title: {fontSize: 14, color: palette.body, marginTop: 8, lineHeight: 20},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginTop: 24,
  },
  grade: {
    width: '18%',
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {backgroundColor: palette.primary},
  gradeText: {fontSize: 15, fontWeight: '700', color: palette.ink},
  selectedText: {color: palette.surface},
  hint: {
    fontSize: 11,
    color: palette.muted,
    textAlign: 'center',
    marginTop: 18,
  },
  clear: {alignItems: 'center', padding: 14, marginTop: 8},
  clearText: {fontSize: 13, fontWeight: '600', color: palette.primary},
});
