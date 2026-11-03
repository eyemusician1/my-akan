import {ScreenModal as Modal} from '../../../shared/components/ScreenModal';
import React, {useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {palette} from '../../../tokens';
import {
  enterBottomSheet,
  exitBottomSheet,
  SHEET_CLOSED_OFFSET,
} from '../../../shared/animations/bottomSheet';
import {StudentProfile} from '../data/profileStore';
import {COLLEGES, YEAR_LEVELS} from '../data/options';

export function ProfileEditor({
  open,
  profile,
  onClose,
  onSave,
}: {
  open: boolean;
  profile: StudentProfile;
  onClose: () => void;
  onSave: (profile: StudentProfile) => Promise<void>;
}) {
  const insets = useSafeAreaInsets(),
    {height} = useWindowDimensions();
  const [form, setForm] = useState(profile),
    [collegePicker, setCollegePicker] = useState(false),
    [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false),
    [presented, setPresented] = useState(open),
    [reduced, setReduced] = useState(false);
  const busy = useRef(false),
    mounted = useRef(true),
    currentOpen = useRef(open),
    wasPresented = useRef(open);
  currentOpen.current = open;
  const opacity = useRef(new Animated.Value(0)).current,
    translate = useRef(new Animated.Value(SHEET_CLOSED_OFFSET)).current;
  useEffect(() => {
    mounted.current = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (mounted.current) setReduced(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    return () => {
      mounted.current = false;
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    if (open) {
      wasPresented.current = true;
      setForm(profile);
      setCollegePicker(false);
      setSearch('');
    }
  }, [open, profile]);
  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    if (open) {
      setPresented(true);
      if (reduced) {
        opacity.setValue(1);
        translate.setValue(0);
      } else {
        animation = enterBottomSheet(opacity, translate);
        animation.start();
      }
    } else if (wasPresented.current) {
      const finish = () => {
        if (!currentOpen.current) {
          wasPresented.current = false;
          setPresented(false);
        }
      };
      if (reduced) finish();
      else {
        animation = exitBottomSheet(opacity, translate);
        animation.start(({finished}) => {
          if (finished) finish();
        });
      }
    }
    return () => animation?.stop();
  }, [open, reduced, opacity, translate]);
  const close = () => {
    if (busy.current) return;
    Keyboard.dismiss();
    if (collegePicker) setCollegePicker(false);
    else onClose();
  };
  const save = async () => {
    if (busy.current || !form.name.trim()) return;
    busy.current = true;
    setSaving(true);
    Keyboard.dismiss();
    try {
      await onSave(form);
      if (mounted.current) onClose();
    } catch (error) {
      if (mounted.current)
        Alert.alert(
          'Profile not saved',
          error instanceof Error ? error.message : 'Please try again.',
        );
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  return (
    <Modal
      visible={open || presented}
      transparent
      animationType="none"
      hardwareAccelerated
      onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {backgroundColor: 'rgba(0,0,0,0.4)', opacity},
          ]}
        />
        <Pressable
          style={StyleSheet.absoluteFillObject}
          accessibilityRole="button"
          accessibilityLabel="Close profile editor"
          disabled={saving || !open}
          onPress={close}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: height * 0.9,
              ...(collegePicker ? {height: height * 0.85} : {}),
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{translateY: translate}],
            },
          ]}>
          <View style={styles.header}>
            <Text style={styles.heading}>
              {collegePicker ? 'College' : 'Edit profile'}
            </Text>
            <Pressable
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel={
                collegePicker ? 'Back to profile fields' : 'Cancel profile edit'
              }
              disabled={saving || !open}
              onPress={close}>
              <MaterialIcon
                name={collegePicker ? 'arrow-back' : 'close'}
                size={24}
                color={palette.body}
              />
            </Pressable>
          </View>
          {collegePicker ? (
            <>
              <TextInput
                style={styles.input}
                accessibilityLabel="Search colleges"
                placeholder="Search colleges"
                placeholderTextColor={palette.muted}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={COLLEGES.filter(college =>
                  college.toLowerCase().includes(search.trim().toLowerCase()),
                )}
                keyExtractor={item => item}
                ListEmptyComponent={
                  <Text style={styles.label}>No colleges found.</Text>
                }
                renderItem={({item}) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{checked: form.college === item}}
                    onPress={() => {
                      Keyboard.dismiss();
                      setForm(value => ({...value, college: item}));
                      setCollegePicker(false);
                    }}
                    style={styles.college}>
                    <Text style={styles.collegeText}>{item}</Text>
                    {form.college === item && (
                      <MaterialIcon
                        name="check"
                        size={20}
                        color={palette.primary}
                      />
                    )}
                  </Pressable>
                )}
              />
            </>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === 'ios' ? 'interactive' : 'on-drag'
              }
              showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                style={styles.input}
                accessibilityLabel="Full name"
                value={form.name}
                onChangeText={name => setForm(value => ({...value, name}))}
                maxLength={80}
                editable={!saving}
                autoCapitalize="words"
              />
              <Text style={styles.label}>Year level</Text>
              <View style={styles.years}>
                {YEAR_LEVELS.map(year => (
                  <Pressable
                    key={year}
                    accessibilityRole="radio"
                    accessibilityLabel={year}
                    accessibilityState={{
                      checked: form.yearLevel === year,
                      disabled: saving,
                    }}
                    disabled={saving}
                    onPress={() => {
                      Keyboard.dismiss();
                      setForm(value => ({...value, yearLevel: year}));
                    }}
                    style={[
                      styles.year,
                      year === form.yearLevel && styles.selected,
                    ]}>
                    <Text
                      style={[
                        styles.yearText,
                        year === form.yearLevel && styles.selectedText,
                      ]}>
                      {year}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Student ID (optional)</Text>
              <TextInput
                style={styles.input}
                accessibilityLabel="Student ID"
                value={form.studentId}
                onChangeText={studentId =>
                  setForm(value => ({...value, studentId}))
                }
                maxLength={40}
                editable={!saving}
                autoCapitalize="characters"
              />
              <Text style={styles.label}>College</Text>
              <Pressable
                style={styles.collegeField}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Choose college"
                onPress={() => {
                  Keyboard.dismiss();
                  setSearch('');
                  setCollegePicker(true);
                }}>
                <Text style={styles.collegeText}>
                  {form.college || 'Choose college'}
                </Text>
                <MaterialIcon
                  name="expand-more"
                  size={22}
                  color={palette.muted}
                />
              </Pressable>
              <Text style={styles.label}>Course (optional)</Text>
              <TextInput
                style={styles.input}
                accessibilityLabel="Course"
                value={form.course}
                onChangeText={course => setForm(value => ({...value, course}))}
                maxLength={120}
                editable={!saving}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <Pressable
                style={[
                  styles.save,
                  (!form.name.trim() || saving) && styles.disabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save profile"
                accessibilityState={{
                  busy: saving,
                  disabled: saving || !form.name.trim(),
                }}
                disabled={saving || !form.name.trim() || !open}
                onPress={save}>
                {saving ? (
                  <ActivityIndicator color={palette.surface} />
                ) : (
                  <Text style={styles.saveText}>Save changes</Text>
                )}
              </Pressable>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: palette.bg,
    padding: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heading: {fontSize: 22, fontWeight: '700', color: palette.ink},
  close: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    color: palette.body,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: palette.ink,
    marginBottom: 18,
  },
  years: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18},
  year: {
    flexGrow: 1,
    padding: 12,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: palette.surface,
    alignItems: 'center',
  },
  yearText: {fontSize: 14, color: palette.body, fontWeight: '600'},
  selected: {backgroundColor: palette.primary},
  selectedText: {color: palette.surface},
  collegeField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 18,
  },
  college: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  collegeText: {flex: 1, fontSize: 15, color: palette.ink, lineHeight: 22},
  save: {
    backgroundColor: palette.primary,
    borderRadius: 22,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  saveText: {color: palette.surface, fontSize: 16, fontWeight: '700'},
  disabled: {opacity: 0.5},
});
