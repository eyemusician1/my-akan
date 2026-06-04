import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  LayoutAnimation,
  UIManager
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, spacing } from '../tokens/colors';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const DAYS_OF_WEEK = [
  { label: 'M', value: 'Mon' },
  { label: 'T', value: 'Tue' },
  { label: 'W', value: 'Wed' },
  { label: 'Th', value: 'Thu' },
  { label: 'F', value: 'Fri' },
  { label: 'S', value: 'Sat' },
];

const TERMS = ['1st Sem', '2nd Sem', 'Summer'];
const UNITS = [1, 2, 3, 4, 5, 6];

export function ManualEntryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  // --- ENROLLMENT CONTEXT (Sticky) ---
  const [semester, setSemester] = useState('1st Sem');
  const [totalSubjects, setTotalSubjects] = useState('');

  // --- PROGRESS TRACKING ---
  const [addedCount, setAddedCount] = useState(0);
  const [totalAddedUnits, setTotalAddedUnits] = useState(0);

  // --- CURRENT SUBJECT DETAILS ---
  const [code, setCode] = useState('');
  const [section, setSection] = useState('');
  const [title, setTitle] = useState('');
  const [units, setUnits] = useState(3);
  const [isUnitsOpen, setIsUnitsOpen] = useState(false);

  const [room, setRoom] = useState('');
  const [instructor, setInstructor] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const [startTime, setStartTime] = useState('');
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>('AM');
  const [endTime, setEndTime] = useState('');
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>('AM');

  // --- STRICT LIMIT LOGIC FOR UNITS ---
  const maxUnits = semester === 'Summer' ? 6 : 24;
  const isOverload = (totalAddedUnits + units) > maxUnits;

  const handleTermChange = (term: string) => {
    Keyboard.dismiss();
    if (term !== semester) {
      setSemester(term);
      setAddedCount(0);
      setTotalAddedUnits(0);
      setTotalSubjects('');
    }
  };

  // CHANGED: Fixed the subject count. It no longer caps at 24 or 6.
  // You can now enter normal subject counts like 8 or 9!
  const handleTotalSubjectsChange = (text: string) => {
    let cleaned = text.replace(/[^0-9]/g, '');
    setTotalSubjects(cleaned);
  };

  const toggleDay = (dayValue: string) => {
    Keyboard.dismiss();
    if (selectedDays.includes(dayValue)) {
      setSelectedDays(selectedDays.filter(d => d !== dayValue));
    } else {
      setSelectedDays([...selectedDays, dayValue]);
    }
  };

  const toggleUnitsDropdown = () => {
    Keyboard.dismiss();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsUnitsOpen(!isUnitsOpen);
  };

  const selectUnit = (unit: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setUnits(unit);
    setIsUnitsOpen(false);
  };

  const formatTimeInput = (text: string) => {
    let cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length >= 1) {
      let hr = parseInt(cleaned.substring(0, 2), 10);
      if (hr > 12) cleaned = '12' + cleaned.substring(2);
      if (cleaned.length === 2 && hr === 0) cleaned = '12';
    }
    if (cleaned.length >= 3) {
      let min = parseInt(cleaned.substring(2, 4), 10);
      if (min > 59) cleaned = cleaned.substring(0, 2) + '59';
    }
    if (cleaned.length > 2) {
      return cleaned.substring(0, 2) + ':' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const isFormValid =
    totalSubjects.trim().length > 0 &&
    code.trim().length > 0 &&
    section.trim().length > 0 &&
    title.trim().length > 0 &&
    room.trim().length > 0 &&
    instructor.trim().length > 0 &&
    selectedDays.length > 0 &&
    startTime.length === 5 &&
    endTime.length === 5 &&
    !isOverload; // Form stays locked if Units exceed maxUnits

  const handleSaveAndAddAnother = () => {
    Keyboard.dismiss();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setAddedCount(prev => prev + 1);
    setTotalAddedUnits(prev => prev + units); // Adds the units to the running total

    setCode('');
    setSection('');
    setTitle('');
    setUnits(3);
    setRoom('');
    setInstructor('');
    setSelectedDays([]);
    setStartTime('');
    setEndTime('');
    setIsUnitsOpen(false);
  };

  const handleSaveAndFinish = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>

          <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                Keyboard.dismiss();
                navigation.goBack();
              }}
            >
              <MaterialIcon name="arrow-back" size={24} color={palette.ink} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Schedule</Text>
            <View style={styles.headerRight} />
          </View>

          {addedCount > 0 && (
            <View style={styles.progressBanner}>
              <MaterialIcon name="check-circle" size={18} color={palette.surface} />
              <Text style={styles.progressText}>
                {addedCount} {totalSubjects ? `of ${totalSubjects}` : ''} subjects • {totalAddedUnits}/{maxUnits} Units
              </Text>
            </View>
          )}

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Academic Term</Text>

              <View style={styles.termRow}>
                {TERMS.map((term) => {
                  const isSelected = semester === term;
                  const isDisabled = addedCount > 0 && !isSelected;

                  return (
                    <TouchableOpacity
                      key={term}
                      activeOpacity={0.7}
                      disabled={isDisabled}
                      onPress={() => handleTermChange(term)}
                      style={[
                        styles.termPill,
                        isSelected && styles.termPillActive,
                        isDisabled && styles.termPillDisabled
                      ]}
                    >
                      <Text style={[
                        styles.termPillText,
                        isSelected && styles.termPillTextActive,
                        isDisabled && styles.termTextDisabled
                      ]}>
                        {term}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {addedCount === 0 && (
                <View style={styles.totalSubjectsWrapper}>
                  <Text style={styles.inputContextLabel}>Total Enrolled Subjects</Text>
                  <TextInput
                    style={styles.inputContext}
                    placeholder="e.g. 8"
                    placeholderTextColor={palette.muted}
                    value={totalSubjects}
                    onChangeText={handleTotalSubjectsChange} // Fixed logic here
                    keyboardType="number-pad"
                    maxLength={2}
                    returnKeyType="done"
                  />
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Subject Details</Text>

              <View style={styles.codeUnitRow}>
                <TextInput
                  style={[styles.input, styles.flex2, { marginBottom: 0 }]}
                  placeholder="Subject Code"
                  placeholderTextColor={palette.muted}
                  value={code}
                  onChangeText={setCode}
                  autoCapitalize="characters"
                  returnKeyType="next"
                />
                <View style={styles.spacer} />

                <TouchableOpacity
                  style={[styles.unitDropdownToggle, isOverload && styles.unitDropdownError]}
                  activeOpacity={0.7}
                  onPress={toggleUnitsDropdown}
                >
                  <Text style={[styles.unitDropdownText, isOverload && styles.textError]}>{units} Units</Text>
                  <MaterialIcon
                    name={isUnitsOpen ? "arrow-drop-up" : "arrow-drop-down"}
                    size={24}
                    color={isOverload ? '#d32f2f' : palette.ink}
                  />
                </TouchableOpacity>
              </View>

              {isOverload && (
                <View style={styles.errorBanner}>
                  <MaterialIcon name="error-outline" size={14} color="#d32f2f" />
                  <Text style={styles.errorText}>
                    Exceeds {maxUnits} unit maximum for {semester}.
                  </Text>
                </View>
              )}

              {isUnitsOpen && (
                <View style={styles.unitOptionsRow}>
                  {UNITS.map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitOptionPill, units === u && styles.unitOptionPillActive]}
                      onPress={() => selectUnit(u)}
                    >
                      <Text style={[styles.unitOptionText, units === u && styles.unitOptionTextActive]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TextInput
                style={[styles.input, { marginTop: spacing.md }]}
                placeholder="Section (e.g. Gg)"
                placeholderTextColor={palette.muted}
                value={section}
                onChangeText={setSection}
                maxLength={7}
                autoCapitalize="characters"
                returnKeyType="next"
              />

              <TextInput
                style={styles.input}
                placeholder="Descriptive Title"
                placeholderTextColor={palette.muted}
                value={title}
                onChangeText={setTitle}
                returnKeyType="done"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Logistics</Text>
              <TextInput
                style={styles.input}
                placeholder="Room / Location"
                placeholderTextColor={palette.muted}
                value={room}
                onChangeText={setRoom}
                returnKeyType="next"
              />
              <TextInput
                style={styles.input}
                placeholder="Instructor Name"
                placeholderTextColor={palette.muted}
                value={instructor}
                onChangeText={setInstructor}
                returnKeyType="done"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Class Days</Text>
              <View style={styles.daysRow}>
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = selectedDays.includes(day.value);
                  return (
                    <TouchableOpacity
                      key={day.value}
                      activeOpacity={0.7}
                      onPress={() => toggleDay(day.value)}
                      style={[
                        styles.dayPill,
                        isSelected && styles.dayPillActive
                      ]}
                    >
                      <Text style={[styles.dayPillText, isSelected && styles.dayPillTextActive]}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Time</Text>
              <View style={styles.timeRow}>

                <View style={styles.timeContainer}>
                  <Text style={styles.timeLabel}>Starts</Text>
                  <View style={styles.timeInputWrapper}>
                    <TextInput
                      style={styles.timeValueInput}
                      value={startTime}
                      onChangeText={(text) => setStartTime(formatTimeInput(text))}
                      placeholder="08:30"
                      placeholderTextColor={palette.muted}
                      keyboardType="number-pad"
                      maxLength={5}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      style={styles.amPmToggle}
                      onPress={() => setStartAmPm(prev => prev === 'AM' ? 'PM' : 'AM')}
                    >
                      <Text style={styles.amPmText}>{startAmPm}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.timeDivider}>
                  <MaterialIcon name="arrow-forward" size={20} color={palette.muted} />
                </View>

                <View style={styles.timeContainer}>
                  <Text style={styles.timeLabel}>Ends</Text>
                  <View style={styles.timeInputWrapper}>
                    <TextInput
                      style={styles.timeValueInput}
                      value={endTime}
                      onChangeText={(text) => setEndTime(formatTimeInput(text))}
                      placeholder="10:00"
                      placeholderTextColor={palette.muted}
                      keyboardType="number-pad"
                      maxLength={5}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      style={styles.amPmToggle}
                      onPress={() => setEndAmPm(prev => prev === 'AM' ? 'PM' : 'AM')}
                    >
                      <Text style={styles.amPmText}>{endAmPm}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

              </View>
            </View>

          </ScrollView>

          {isFormValid && (
            <View style={[styles.bottomWrapper, { paddingBottom: insets.bottom + spacing.xl }]}>

              <TouchableOpacity
                style={styles.addAnotherButton}
                activeOpacity={0.7}
                onPress={handleSaveAndAddAnother}
              >
                <MaterialIcon name="add" size={20} color={palette.primary} />
                <Text style={styles.addAnotherText}>Save & Add Another</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fabSave}
                activeOpacity={0.9}
                onPress={handleSaveAndFinish}
              >
                <MaterialIcon name="check" size={24} color={palette.surface} style={styles.fabIcon} />
                <Text style={styles.fabSaveText}>Save & Finish</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  innerContainer: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  backButton: { padding: spacing.sm },
  headerTitle: { fontSize: 20, fontWeight: '700', color: palette.ink },
  headerRight: { width: 40 },

  progressBanner: {
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: spacing.xl,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  progressText: { color: palette.surface, fontSize: 13, fontWeight: '600', marginLeft: 6 },

  scrollContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 160 },
  section: { marginBottom: spacing.xxl },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: palette.ink, marginBottom: spacing.md, opacity: 0.8 },

  termRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  termPill: { flex: 1, height: 44, borderRadius: 22, backgroundColor: 'rgba(28, 28, 30, 0.04)', justifyContent: 'center', alignItems: 'center' },
  termPillActive: { backgroundColor: palette.ink },
  termPillText: { fontSize: 14, fontWeight: '600', color: palette.ink },
  termPillTextActive: { color: palette.surface },

  termPillDisabled: { opacity: 0.35, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(28,28,30,0.1)' },
  termTextDisabled: { color: palette.muted },

  totalSubjectsWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(28, 28, 30, 0.04)', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12 },
  inputContextLabel: { fontSize: 15, fontWeight: '600', color: palette.ink },
  inputContext: { fontSize: 16, fontWeight: '700', color: palette.ink, backgroundColor: 'rgba(255, 255, 255, 0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, textAlign: 'center', minWidth: 60 },

  codeUnitRow: { flexDirection: 'row', alignItems: 'center' },
  flex2: { flex: 2 },
  spacer: { width: spacing.md },
  unitDropdownToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(28, 28, 30, 0.04)', height: 56, borderRadius: 16, paddingHorizontal: 16 },
  unitDropdownError: { borderWidth: 1, borderColor: '#d32f2f', backgroundColor: 'rgba(211, 47, 47, 0.05)' },
  unitDropdownText: { fontSize: 15, fontWeight: '600', color: palette.ink },
  textError: { color: '#d32f2f' },

  errorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 },
  errorText: { color: '#d32f2f', fontSize: 12, fontWeight: '600', marginLeft: 4 },

  unitOptionsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(28, 28, 30, 0.04)', borderRadius: 16, padding: 8, marginTop: spacing.sm },
  unitOptionPill: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  unitOptionPillActive: { backgroundColor: palette.primary },
  unitOptionText: { fontSize: 14, fontWeight: '600', color: palette.ink },
  unitOptionTextActive: { color: palette.surface },

  input: { backgroundColor: 'rgba(28, 28, 30, 0.04)', borderRadius: 16, paddingHorizontal: 20, height: 56, fontSize: 16, fontWeight: '500', color: palette.ink, marginBottom: spacing.md },

  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayPill: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(28, 28, 30, 0.04)', justifyContent: 'center', alignItems: 'center' },
  dayPillActive: { backgroundColor: palette.primary },
  dayPillText: { fontSize: 15, fontWeight: '600', color: palette.ink },
  dayPillTextActive: { color: palette.surface },

  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeContainer: { flex: 1, backgroundColor: 'rgba(28, 28, 30, 0.04)', borderRadius: 16, padding: 12, alignItems: 'center' },
  timeLabel: { fontSize: 12, color: palette.muted, fontWeight: '600', marginBottom: 6 },
  timeInputWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  timeValueInput: { fontSize: 18, color: palette.ink, fontWeight: '700', textAlign: 'center', padding: 0, margin: 0, marginRight: 6, minWidth: 54 },
  amPmToggle: { backgroundColor: 'rgba(28, 28, 30, 0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  amPmText: { fontSize: 14, fontWeight: '700', color: palette.primary },
  timeDivider: { paddingHorizontal: spacing.md },

  bottomWrapper: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', backgroundColor: palette.bg, paddingTop: spacing.md },
  addAnotherButton: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  addAnotherText: { color: palette.primary, fontSize: 15, fontWeight: '700', marginLeft: 4 },
  fabSave: { height: 64, borderRadius: 32, backgroundColor: palette.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 48, shadowColor: palette.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 6 },
  fabIcon: { marginRight: spacing.sm },
  fabSaveText: { color: palette.surface, fontSize: 18, fontWeight: '700' },
});