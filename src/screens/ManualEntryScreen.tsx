import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  LayoutAnimation,
  UIManager,
  Modal,
  Animated,
  DeviceEventEmitter
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, spacing } from '../tokens';
import { useToast } from '../shared/hooks/useToast';
import { scheduleRepository } from '../features/schedule/data';
import { scheduleService } from '../features/schedule/services/scheduleService';
import { getUnitLimit, normalizeSemester, ScheduleValidationError } from '../features/schedule/domain/rules';
import { SubjectDraft } from '../features/schedule/domain/types';
import { toTimeInput } from '../features/schedule/domain/time';
import { AppScreenProps } from '../navigation/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
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

export function ManualEntryScreen({ navigation, route }: AppScreenProps<'ManualEntry'>) {
  const insets = useSafeAreaInsets();

  const editSubjectId = route?.params?.editSubjectId;
  const rawExtractedSemester = route?.params?.extractedSemester;

  const normalizedExtracted = rawExtractedSemester ? normalizeSemester(rawExtractedSemester) : '';

  const initialQueue = route?.params?.extractedSubjects || [];
  const [reviewQueue, setReviewQueue] = useState<SubjectDraft[]>(initialQueue);
  const totalScanned = useRef(initialQueue.length).current;

  const [isSaving, setIsSaving] = useState(false);
  const saveInProgress = useRef(false);

  const [semester, setSemester] = useState(normalizedExtracted || '1st Sem');
  const [declaredTotalUnits, setDeclaredTotalUnits] = useState('');

  const [addedCount, setAddedCount] = useState(0);
  const [totalAddedUnits, setTotalAddedUnits] = useState(0);

  const [code, setCode] = useState('');
  const [section, setSection] = useState('');
  const [title, setTitle] = useState('');
  const [units, setUnits] = useState(3);
  const [originalUnits, setOriginalUnits] = useState(0);
  const [isUnitsOpen, setIsUnitsOpen] = useState(false);

  const [room, setRoom] = useState('');
  const [instructor, setInstructor] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const [startTime, setStartTime] = useState('');
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>('AM');
  const [endTime, setEndTime] = useState('');
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>('AM');

  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '' });
  const closeAlert = () => setCustomAlert(prev => ({ ...prev, visible: false }));

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const sectionRef = useRef<TextInput>(null);
  const titleRef = useRef<TextInput>(null);
  const roomRef = useRef<TextInput>(null);
  const instructorRef = useRef<TextInput>(null);
  const endTimeRef = useRef<TextInput>(null);

  const {message: toastMessage, opacity: toastOpacity, translateY: toastTranslateY, showToast: showLocalToast} = useToast();

  const maxUnits = getUnitLimit(semester);

  const handleDeclaredUnitsChange = (text: string) => {
    let cleaned = text.replace(/[^0-9]/g, '');
    const parsed = parseInt(cleaned, 10);

    if (!isNaN(parsed) && parsed > maxUnits) {
      showLocalToast(`Maximum allowed for ${semester} is ${maxUnits} units`);
      cleaned = maxUnits.toString();
    }
    setDeclaredTotalUnits(cleaned);
  };

  const handleTermChange = (term: string) => {
    Keyboard.dismiss();
    if (term !== semester) {
      setSemester(term);
      const newMax = getUnitLimit(term);
      const currentDeclared = parseInt(declaredTotalUnits, 10);

      if (!isNaN(currentDeclared) && currentDeclared > newMax) {
        setDeclaredTotalUnits(newMax.toString());
        showLocalToast(`Units capped to ${newMax} max for ${term}`);
      }
    }
  };

  const declaredLimitNum = parseInt(declaredTotalUnits, 10);

  const isDeclaredUnitLimitReached =
    reviewQueue.length === 0 &&
    !editSubjectId &&
    !isNaN(declaredLimitNum) &&
    totalAddedUnits >= declaredLimitNum;

  const isSystemOverload = editSubjectId
    ? (totalAddedUnits - originalUnits + units) > maxUnits
    : (totalAddedUnits + units) > maxUnits;

  const isDeclaredOverload = !editSubjectId && !isNaN(declaredLimitNum)
    ? (totalAddedUnits + units) > declaredLimitNum
    : false;

  const hasUnitError = isSystemOverload || isDeclaredOverload;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reviewQueue.length > 0 && normalizedExtracted) {
      setSemester(normalizedExtracted);
    }
  }, [reviewQueue, normalizedExtracted]);

  useEffect(() => {
    if (editSubjectId) {
      const loadSubject = async () => {
        try {
          const subject = await scheduleRepository.findSubject(editSubjectId);
          const sched = await subject.schedule.fetch();

          setSemester(sched.academicTerm);
          setAddedCount(1);
          setCode(subject.code);
          setSection(subject.section || '');
          setTitle(subject.title);
          setUnits(subject.units);
          setOriginalUnits(subject.units);
          setRoom(subject.room || '');
          setInstructor(subject.instructor || '');
          setSelectedDays(subject.days);

          const start = toTimeInput(subject.startTime);
          const end = toTimeInput(subject.endTime);
          setStartTime(start.time);
          setStartAmPm(start.period);
          setEndTime(end.time);
          setEndAmPm(end.period);
        } catch (e) {
          console.error("Failed to load subject", e);
        }
      };
      loadSubject();
    } else if (reviewQueue.length > 0) {
      const current = reviewQueue[0];
      setCode(current.code || '');
      setSection(current.section || '');
      setTitle(current.title || '');
      setUnits(current.units || 3);
      setRoom(current.room || '');
      setInstructor(current.instructor || '');
      setSelectedDays(current.days || []);

      const start = toTimeInput(current.startTime);
      const end = toTimeInput(current.endTime);
      setStartTime(start.time);
      setStartAmPm(start.period);
      setEndTime(end.time);
      setEndAmPm(end.period);
    }
  }, [editSubjectId, reviewQueue]);

  useEffect(() => {
    if (editSubjectId || reviewQueue.length > 0 || normalizedExtracted) return;

    const initRecentTerm = async () => {
      const recent = await scheduleRepository.getLatestSchedule();
      if (recent) {
        setSemester(recent.academicTerm);
      }
    };
    initRecentTerm();
  }, [editSubjectId, reviewQueue, normalizedExtracted]);

  useEffect(() => {
    let isMounted = true;
    const loadTermData = async () => {
      try {
        const summary = await scheduleRepository.getTermSummary(semester);
        if (!isMounted) return;
        setDeclaredTotalUnits(summary.declaredUnits?.toString() || '');
        if (!editSubjectId) setAddedCount(summary.subjectCount);
        setTotalAddedUnits(summary.totalUnits);
      } catch (error) {
        console.error('Failed to load term summary', error);
      }
    };

    loadTermData();
    return () => { isMounted = false; };
  }, [semester, editSubjectId]);

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

  const isTimeComplete = startTime.length === 5 && endTime.length === 5 && selectedDays.length > 0;
  const isTBA = startTime.length === 0 && endTime.length === 0 && selectedDays.length === 0;
  const isLogisticsValid = isTimeComplete || isTBA;

  // NEW LOGIC: Form is strictly valid if target is reached.
  // Otherwise, it checks for standard form completion rules.
  const isFormValid = isDeclaredUnitLimitReached ? true : (
    (editSubjectId || reviewQueue.length > 0 ? true : declaredTotalUnits.trim().length > 0) &&
    code.trim().length > 0 &&
    title.trim().length > 0 &&
    isLogisticsValid &&
    !hasUnitError
  );

  const newTotalAfterSave = totalAddedUnits + units;
  const canAddAnother =
    !isDeclaredUnitLimitReached &&
    isFormValid &&
    (newTotalAfterSave < maxUnits) &&
    (isNaN(declaredLimitNum) || newTotalAfterSave < declaredLimitNum);

  const saveSubject = async (finish: boolean) => {
    if (saveInProgress.current || !isFormValid) return;
    Keyboard.dismiss();
    if (isDeclaredUnitLimitReached && code.trim().length === 0) {
      DeviceEventEmitter.emit('SHOW_TOAST', 'Schedule setup complete');
      navigation.goBack();
      return;
    }

    saveInProgress.current = true;
    setIsSaving(true);
    try {
      const { syncIssues } = await scheduleService.saveSubject({
        academicTerm: semester,
        declaredUnits: declaredTotalUnits ? Number(declaredTotalUnits) : undefined,
        subjectId: editSubjectId,
        subject: {
          code, section, title, units, room, instructor,
          days: selectedDays,
          startTime: startTime ? `${startTime} ${startAmPm}` : '',
          endTime: endTime ? `${endTime} ${endAmPm}` : '',
        },
      });
      const message = syncIssues.length
        ? `Subject saved; could not refresh ${syncIssues.join(' and ')}`
        : editSubjectId ? 'Subject updated' : finish ? 'Schedule saved' : 'Subject added';

      if (finish) {
        DeviceEventEmitter.emit('SHOW_TOAST', message);
        navigation.goBack();
      } else {
        showLocalToast(message);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setAddedCount(prev => prev + 1);
        setTotalAddedUnits(prev => prev + units);
        if (reviewQueue.length > 1) {
          setReviewQueue(prev => prev.slice(1));
        } else {
          setReviewQueue([]);
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
        }
      }
    } catch (error) {
      setCustomAlert({
        visible: true,
        title: error instanceof ScheduleValidationError ? error.title : 'Save failed',
        message: error instanceof ScheduleValidationError ? error.message : 'Could not commit changes. Please try again.',
      });
    } finally {
      saveInProgress.current = false;
      setIsSaving(false);
    }
  };

  const handleSaveAndAddAnother = () => saveSubject(false);
  const handleSaveAndFinish = () => saveSubject(true);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 20}
    >
      <View style={styles.innerContainer}>

        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => { Keyboard.dismiss(); navigation.goBack(); }}>
            <MaterialIcon name="arrow-back" size={24} color={palette.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editSubjectId ? 'Edit Subject' : reviewQueue.length > 0 ? 'Review Scans' : 'New Schedule'}</Text>
          <View style={styles.headerRight} />
        </View>

        {reviewQueue.length > 0 && !editSubjectId && (
          <View style={styles.scannerBanner}>
            <MaterialIcon name="document-scanner" size={18} color={palette.surface} />
            <Text style={styles.scannerBannerText}>
              Reviewing scanned subject {totalScanned - reviewQueue.length + 1} of {totalScanned}
            </Text>
          </View>
        )}

        {addedCount > 0 && !editSubjectId && reviewQueue.length === 0 && (
          <View style={styles.progressBanner}>
            <MaterialIcon name="check-circle" size={18} color={palette.surface} />
            <Text style={styles.progressText}>
              {addedCount} {addedCount === 1 ? 'subject' : 'subjects'} • {totalAddedUnits}/{declaredTotalUnits || maxUnits} Units Enrolled
            </Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >

          {/* Academic Term Section (Always Visible) */}
          <View style={styles.section} pointerEvents={reviewQueue.length > 0 ? 'none' : 'auto'}>
            <Text style={styles.sectionLabel}>Academic Term</Text>

            <View style={styles.termRow}>
              {TERMS.map((term) => {
                const isSelected = semester === term;
                const isReviewLocked = reviewQueue.length > 0;
                const isDisabled = (addedCount > 0 && !isSelected) || (isReviewLocked && !isSelected);

                return (
                  <TouchableOpacity
                    key={term}
                    activeOpacity={0.7}
                    disabled={isDisabled || isReviewLocked}
                    onPress={() => handleTermChange(term)}
                    style={[ styles.termPill, isSelected && styles.termPillActive, isDisabled && styles.termPillDisabled ]}
                  >
                    <Text style={[ styles.termPillText, isSelected && styles.termPillTextActive, isDisabled && styles.termTextDisabled ]}>
                      {term}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {addedCount === 0 && !editSubjectId && reviewQueue.length === 0 && (
              <View style={styles.totalSubjectsWrapper}>
                <View>
                  <Text style={styles.inputContextLabel}>Total Enrolled Units</Text>
                  <Text style={styles.inputContextSub}>{maxUnits} max allowed</Text>
                </View>

                <TextInput
                  style={styles.inputContext}
                  placeholder="e.g. 18"
                  placeholderTextColor={palette.muted}
                  value={declaredTotalUnits}
                  onChangeText={handleDeclaredUnitsChange}
                  onSubmitEditing={() => Keyboard.dismiss()}
                  keyboardType="number-pad"
                  maxLength={2}
                  returnKeyType="done"
                />
              </View>
            )}
          </View>

          {/* NEW COMPLETION STATE LOGIC */}
          {isDeclaredUnitLimitReached ? (
            <View style={styles.completionStateContainer}>
              <View style={styles.completionIconCircle}>
                <MaterialIcon name="task-alt" size={40} color={palette.primary} />
              </View>
              <Text style={styles.completionTitle}>Target Reached!</Text>
              <Text style={styles.completionSubtitle}>
                You've successfully mapped out all {declaredTotalUnits} units for {semester}. Your schedule is fully loaded and ready to go.
              </Text>
            </View>
          ) : (
            <View>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Subject Details</Text>

                <View style={styles.codeUnitRow}>
                  <TextInput
                    style={[styles.input, styles.flex2, { marginBottom: 0 }]}
                    placeholder="Subject Code"
                    placeholderTextColor={palette.muted}
                    value={code}
                    onChangeText={setCode}
                    onSubmitEditing={() => titleRef.current?.focus()}
                    autoCapitalize="characters"
                    returnKeyType="next"
                  />
                  <View style={styles.spacer} />

                  <TouchableOpacity style={[styles.unitDropdownToggle, hasUnitError && styles.unitDropdownError]} activeOpacity={0.7} onPress={toggleUnitsDropdown}>
                    <Text style={[styles.unitDropdownText, hasUnitError && styles.textError]}>{units} Units</Text>
                    <MaterialIcon name={isUnitsOpen ? "arrow-drop-up" : "arrow-drop-down"} size={24} color={hasUnitError ? '#d32f2f' : palette.ink} />
                  </TouchableOpacity>
                </View>

                {hasUnitError && (
                  <View style={styles.errorBanner}>
                    <MaterialIcon name="error-outline" size={14} color="#d32f2f" />
                    <Text style={styles.errorText}>
                      {isSystemOverload
                        ? `Exceeds ${maxUnits}-unit maximum for ${semester}.`
                        : `Exceeds your declared target of ${declaredTotalUnits} units.`}
                    </Text>
                  </View>
                )}

                {isUnitsOpen && (
                  <View style={styles.unitOptionsRow}>
                    {UNITS.map(u => (
                      <TouchableOpacity key={u} style={[styles.unitOptionPill, units === u && styles.unitOptionPillActive]} onPress={() => selectUnit(u)}>
                        <Text style={[styles.unitOptionText, units === u && styles.unitOptionTextActive]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TextInput
                  ref={sectionRef}
                  style={[styles.input, { marginTop: spacing.md }]}
                  placeholder="Section (e.g. Gg) (Optional)"
                  placeholderTextColor={palette.muted}
                  value={section}
                  onChangeText={setSection}
                  onSubmitEditing={() => titleRef.current?.focus()}
                  maxLength={7}
                  autoCapitalize="characters"
                  returnKeyType="next"
                />

                <TextInput
                  ref={titleRef}
                  style={styles.input}
                  placeholder="Descriptive Title"
                  placeholderTextColor={palette.muted}
                  value={title}
                  onChangeText={setTitle}
                  onSubmitEditing={() => roomRef.current?.focus()}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Logistics (Optional for TBA)</Text>
                <TextInput
                  ref={roomRef}
                  style={styles.input}
                  placeholder="Room / Location"
                  placeholderTextColor={palette.muted}
                  value={room}
                  onChangeText={setRoom}
                  onSubmitEditing={() => instructorRef.current?.focus()}
                  returnKeyType="next"
                />
                <TextInput
                  ref={instructorRef}
                  style={styles.input}
                  placeholder="Instructor Name"
                  placeholderTextColor={palette.muted}
                  value={instructor}
                  onChangeText={setInstructor}
                  onSubmitEditing={() => Keyboard.dismiss()}
                  returnKeyType="done"
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Class Days (Optional for TBA)</Text>
                <View style={styles.daysRow}>
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = selectedDays.includes(day.value);
                    return (
                      <TouchableOpacity key={day.value} activeOpacity={0.7} onPress={() => toggleDay(day.value)} style={[styles.dayPill, isSelected && styles.dayPillActive]}>
                        <Text style={[styles.dayPillText, isSelected && styles.dayPillTextActive]}>{day.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Time (Optional for TBA)</Text>

                <View style={styles.timeRow}>

                  <View style={styles.timeContainer}>
                    <Text style={styles.timeLabel}>Starts</Text>
                    <View style={styles.timeInputWrapper}>
                      <TextInput
                        style={styles.timeValueInput}
                        value={startTime}
                        onChangeText={(text) => {
                          const formatted = formatTimeInput(text);
                          setStartTime(formatted);
                          if (formatted.length === 5) endTimeRef.current?.focus();
                        }}
                        onSubmitEditing={() => endTimeRef.current?.focus()}
                        placeholder="08:00"
                        placeholderTextColor={palette.muted}
                        keyboardType="number-pad"
                        maxLength={5}
                        returnKeyType="next"
                      />
                      <TouchableOpacity style={styles.amPmToggle} onPress={() => setStartAmPm(prev => prev === 'AM' ? 'PM' : 'AM')}>
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
                        ref={endTimeRef}
                        style={styles.timeValueInput}
                        value={endTime}
                        onChangeText={(text) => {
                          const formatted = formatTimeInput(text);
                          setEndTime(formatted);
                          if (formatted.length === 5) Keyboard.dismiss();
                        }}
                        onSubmitEditing={() => Keyboard.dismiss()}
                        placeholder="05:00"
                        placeholderTextColor={palette.muted}
                        keyboardType="number-pad"
                        maxLength={5}
                        returnKeyType="done"
                      />
                      <TouchableOpacity style={styles.amPmToggle} onPress={() => setEndAmPm(prev => prev === 'AM' ? 'PM' : 'AM')}>
                        <Text style={styles.amPmText}>{endAmPm}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                </View>
              </View>
            </View>
          )}

        </ScrollView>

        {toastMessage && (
          <Animated.View
            style={[
              styles.toastRootContainer,
              {
                bottom: Math.max(insets.bottom, 12) + 120,
                opacity: toastOpacity,
                transform: [{ translateY: toastTranslateY }],
              },
            ]}
          >
            <View style={styles.toastPill}>
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          </Animated.View>
        )}

        {!isKeyboardVisible && (
          <View style={[styles.bottomWrapper, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>

            {!editSubjectId && reviewQueue.length === 0 && !isDeclaredUnitLimitReached && (
              <TouchableOpacity
                style={[styles.addAnotherButton, !canAddAnother && styles.addAnotherDisabled]}
                activeOpacity={0.7}
                disabled={isSaving || !canAddAnother}
                onPress={handleSaveAndAddAnother}
              >
                <MaterialIcon name="add" size={20} color={canAddAnother ? palette.primary : palette.muted} />
                <Text style={[styles.addAnotherText, !canAddAnother && styles.textMuted]}>Save & Add Another</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.fabSave, !isFormValid && styles.fabSaveDisabled]}
              activeOpacity={0.9}
              disabled={isSaving || !isFormValid}
              onPress={() => {
                if (reviewQueue.length > 1) {
                  handleSaveAndAddAnother();
                } else {
                  handleSaveAndFinish();
                }
              }}
            >
              <MaterialIcon
                name={reviewQueue.length > 1 ? "arrow-forward" : "check"}
                size={24}
                color={isFormValid ? palette.surface : palette.muted}
                style={styles.fabIcon}
              />
              <Text style={[styles.fabSaveText, !isFormValid && styles.textMuted]}>
                {isDeclaredUnitLimitReached
                  ? 'Finish & Return Home'
                  : editSubjectId
                    ? 'Update Subject'
                    : reviewQueue.length > 1
                      ? 'Save & Next Subject'
                      : reviewQueue.length === 1
                        ? 'Save & Finish Queue'
                        : 'Save & Finish'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal visible={customAlert.visible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.dialogBox}>
              <Text style={styles.dialogTitle}>{customAlert.title}</Text>
              <Text style={styles.dialogMessage}>{customAlert.message}</Text>

              <View style={styles.dialogActions}>
                <TouchableOpacity style={styles.dialogBtn} onPress={closeAlert}>
                  <Text style={[styles.dialogBtnText, { color: palette.primary }]}>Got it</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
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
  scannerBanner: { backgroundColor: '#C5A059', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, marginHorizontal: spacing.xl, borderRadius: 12, marginBottom: spacing.md },
  scannerBannerText: { color: palette.surface, fontSize: 13, fontWeight: '600', marginLeft: 6 },
  progressBanner: { backgroundColor: palette.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, marginHorizontal: spacing.xl, borderRadius: 12, marginBottom: spacing.md },
  progressText: { color: palette.surface, fontSize: 13, fontWeight: '600', marginLeft: 6 },

  scrollContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 210 },

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
  inputContextSub: { fontSize: 12, color: palette.muted, fontWeight: '500', marginTop: 2 },
  inputContext: { fontSize: 16, fontWeight: '700', color: palette.ink, backgroundColor: 'rgba(255, 255, 255, 0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, textAlign: 'center', minWidth: 60 },

  // NEW COMPLETION STATE STYLES
  completionStateContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, backgroundColor: 'rgba(197, 160, 89, 0.05)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(197, 160, 89, 0.2)', marginTop: spacing.md },
  completionIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(197, 160, 89, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  completionTitle: { fontSize: 22, fontWeight: '800', color: palette.ink, marginBottom: spacing.sm, letterSpacing: -0.5 },
  completionSubtitle: { fontSize: 15, color: palette.body, textAlign: 'center', lineHeight: 22 },

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

  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  timeContainer: { flex: 1, backgroundColor: 'rgba(28, 28, 30, 0.04)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center' },
  timeLabel: { fontSize: 12, color: palette.muted, fontWeight: '600', marginBottom: 4 },
  timeInputWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 4 },
  timeValueInput: { fontSize: 16, color: palette.ink, fontWeight: '700', textAlign: 'center', padding: 0, margin: 0, height: 36, minWidth: 54 },
  amPmToggle: { backgroundColor: 'rgba(28, 28, 30, 0.08)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  amPmText: { fontSize: 13, fontWeight: '700', color: palette.primary },
  timeDivider: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2 },

  bottomWrapper: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', backgroundColor: palette.bg, paddingTop: 10 },
  addAnotherButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingVertical: 4, paddingHorizontal: spacing.md },
  addAnotherText: { color: palette.primary, fontSize: 15, fontWeight: '700', marginLeft: 4 },
  addAnotherDisabled: { opacity: 0.5 },
  textMuted: { color: palette.muted },
  fabSave: { height: 64, borderRadius: 32, backgroundColor: palette.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 48, shadowColor: palette.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 6 },
  fabSaveDisabled: { backgroundColor: 'rgba(28, 28, 30, 0.08)', shadowOpacity: 0, elevation: 0 },
  fabIcon: { marginRight: spacing.sm },
  fabSaveText: { color: palette.surface, fontSize: 18, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  dialogBox: { backgroundColor: palette.surface, borderRadius: 28, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  dialogTitle: { fontSize: 22, fontWeight: '600', color: palette.ink, marginBottom: 14 },
  dialogMessage: { fontSize: 15, color: palette.body, lineHeight: 22, marginBottom: 28 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  dialogBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  dialogBtnText: { fontSize: 15, fontWeight: '600' },

  toastRootContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 9999, pointerEvents: 'none' },
  toastPill: { backgroundColor: palette.ink, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  toastText: { color: palette.surface, fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
});