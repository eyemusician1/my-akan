import {ScreenModal as Modal} from '../shared/components/ScreenModal';
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
  Animated,
  ActivityIndicator,
  DeviceEventEmitter
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, spacing } from '../tokens';
import { useToast } from '../shared/hooks/useToast';
import { scheduleRepository } from '../features/schedule/data';
import { scheduleService } from '../features/schedule/services/scheduleService';
import { getUnitLimit, normalizeSemester, ScheduleValidationError, getLogisticsError } from '../features/schedule/domain/rules';
import { ParsedSubject } from '../features/scanner/domain/scanTypes';
import { TimeField } from '../features/schedule/components/TimeField';
import {UnitSelector} from '../features/schedule/components/UnitSelector';
import { toTimeInput, parseClockField, inferEndPeriod, formatTimeEntry } from '../features/schedule/domain/time';
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
  { label: 'Su', value: 'Sun' },
];

const TERMS = ['1st Sem', '2nd Sem', 'Summer'];

export function ManualEntryScreen({ navigation, route }: AppScreenProps<'ManualEntry'>) {
  const insets = useSafeAreaInsets();

  const editSubjectId = route?.params?.editSubjectId;
  const rawExtractedSemester = route?.params?.extractedSemester;

  const normalizedExtracted = rawExtractedSemester ? normalizeSemester(rawExtractedSemester) : '';

  const initialQueue = route?.params?.extractedSubjects || [];
  const [reviewQueue, setReviewQueue] = useState<ParsedSubject[]>(initialQueue);
  const totalScanned = useRef(initialQueue.length).current;

  const [isSaving, setIsSaving] = useState(false);
  const saveInProgress = useRef(false);

  const [semester, setSemester] = useState(normalizedExtracted || '1st Sem');
  const [declaredTotalUnits, setDeclaredTotalUnits] = useState('');

  const [addedCount, setAddedCount] = useState(0);
  const [hasSavedInSession, setHasSavedInSession] = useState(false);
  const [totalAddedUnits, setTotalAddedUnits] = useState(0);

  const [code, setCode] = useState('');
  const [section, setSection] = useState('');
  const [title, setTitle] = useState('');
  const [units, setUnits] = useState(3);
  const [originalUnits, setOriginalUnits] = useState(0);
  const [originalTerm, setOriginalTerm] = useState('');
  const completedNumericEntry = useRef(false);
  const userSelectedTerm = useRef(false);
  const [isTermLoading, setIsTermLoading] = useState(true);
  const [termLoadFailed, setTermLoadFailed] = useState(false);
  const [termLoadAttempt, setTermLoadAttempt] = useState(0);

  const [room, setRoom] = useState('');
  const [instructor, setInstructor] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const [startTime, setStartTime] = useState('');
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>('AM');
  const [endTime, setEndTime] = useState('');
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>('AM');
  const [endPeriodExplicit, setEndPeriodExplicit] = useState(false);

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
    if (cleaned.length === 2) completedNumericEntry.current = true;
    setDeclaredTotalUnits(cleaned);
  };

  const handleTermChange = (term: string) => {
    Keyboard.dismiss();
    userSelectedTerm.current = true;
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

  const declaredLimitNum = Number(declaredTotalUnits);
  const isDeclaredLimitValid = Number.isInteger(declaredLimitNum) && declaredLimitNum > 0 && declaredLimitNum <= maxUnits;

  const isDeclaredUnitLimitReached =
    reviewQueue.length === 0 &&
    !editSubjectId &&
    isDeclaredLimitValid &&
    totalAddedUnits >= declaredLimitNum;

  const proposedUnits = totalAddedUnits + units - (editSubjectId && originalTerm === semester ? originalUnits : 0);
  const isSystemOverload = proposedUnits > maxUnits;
  const isDeclaredOverload = isDeclaredLimitValid && proposedUnits > declaredLimitNum;

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
    let active = true;
    if (editSubjectId) {
      const loadSubject = async () => {
        try {
          const subject = await scheduleRepository.findSubject(editSubjectId);
          const sched = await subject.schedule.fetch();
          if (!active) return;

          setSemester(sched.academicTerm);
          setAddedCount(1);
          setCode(subject.code);
          setSection(subject.section || '');
          setTitle(subject.title);
          setUnits(subject.units);
          setOriginalUnits(subject.units);
          setOriginalTerm(sched.academicTerm);
          setRoom(subject.room || '');
          setInstructor(subject.instructor || '');
          setSelectedDays(subject.days);

          const start = toTimeInput(subject.startTime);
          const end = toTimeInput(subject.endTime);
          setStartTime(start.time);
          setStartAmPm(start.period);
          setEndTime(end.time);
          setEndAmPm(end.period);
          setEndPeriodExplicit(true);
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
      setUnits(current.units);
      setRoom(current.room || '');
      setInstructor(current.instructor || '');
      setSelectedDays(current.days || []);

      const start = toTimeInput(current.startTime);
      const end = toTimeInput(current.endTime);
      setStartTime(start.time);
      setStartAmPm(start.period);
      setEndTime(end.time);
      setEndAmPm(end.period);
      setEndPeriodExplicit(!!current.endTime);
    }
    return () => { active = false; };
  }, [editSubjectId, reviewQueue]);

  useEffect(() => {
    if (editSubjectId || reviewQueue.length > 0 || normalizedExtracted) return;
    let active = true;
    const initRecentTerm = async () => {
      try {
        const recent = await scheduleRepository.getLatestSchedule();
        if (active && !userSelectedTerm.current && recent) setSemester(recent.academicTerm);
      } catch (error) {
        console.warn('Failed to load recent term', error);
      }
    };
    initRecentTerm();
    return () => { active = false; };
  }, [editSubjectId, reviewQueue, normalizedExtracted]);

  useEffect(() => {
    let isMounted = true;
    setIsTermLoading(true);
    setTermLoadFailed(false);
    const loadTermData = async () => {
      try {
        const summary = await scheduleRepository.getTermSummary(semester);
        if (!isMounted) return;
        setDeclaredTotalUnits(summary.declaredUnits?.toString() || '');
        if (!editSubjectId) setAddedCount(summary.subjectCount);
        setTotalAddedUnits(summary.totalUnits);
      } catch (error) {
        console.error('Failed to load term summary', error);
        if (isMounted) setTermLoadFailed(true);
      } finally {
        if (isMounted) setIsTermLoading(false);
      }
    };

    loadTermData();
    return () => { isMounted = false; };
  }, [semester, editSubjectId, termLoadAttempt]);

  const toggleDay = (dayValue: string) => {
    Keyboard.dismiss();
    if (selectedDays.includes(dayValue)) {
      setSelectedDays(selectedDays.filter(d => d !== dayValue));
    } else {
      setSelectedDays([...selectedDays, dayValue]);
    }
  };

  const selectUnit = (unit: number) => {
    Keyboard.dismiss();
    setUnits(unit);
  };

  const effectiveEndPeriod = endPeriodExplicit ? endAmPm : inferEndPeriod(startTime, startAmPm, endTime);
  const startEntry = parseClockField(startTime, startAmPm);
  const endEntry = parseClockField(endTime, effectiveEndPeriod);
  const isTBA = !startTime.trim() && !endTime.trim() && selectedDays.length === 0;
  const logisticsError = (startTime.trim() && !startEntry.valid) || (endTime.trim() && !endEntry.valid)
    ? 'Check the start and end times.'
    : getLogisticsError(selectedDays, formatTimeEntry(startEntry), formatTimeEntry(endEntry));
  const currentReview = reviewQueue[0]?.review;
  const needsScanLogisticsReview = !!currentReview && !currentReview.explicitTBA && isTBA;
  const isLogisticsValid = !logisticsError && !needsScanLogisticsReview;
  const hasValidUnits = Number.isInteger(units) && units >= 1 && units <= 6;

  const isUnitTargetValid = !!editSubjectId || isDeclaredLimitValid ||
    (reviewQueue.length > 0 && !declaredTotalUnits);
  // A reached target is a completion action; new subjects need a valid form.
  const isFormValid = !isTermLoading && !termLoadFailed && (isDeclaredUnitLimitReached ? true : (
    isUnitTargetValid &&
    code.trim().length > 0 &&
    title.trim().length > 0 &&
    isLogisticsValid &&
    hasValidUnits &&
    !hasUnitError
  ));

  // Only a completed numeric entry can auto-close the keyboard. Loading a scan,
  // reopening a valid field, or pausing halfway through a title must not close it.
  useEffect(() => {
    if (completedNumericEntry.current && isFormValid) Keyboard.dismiss();
    completedNumericEntry.current = false;
  }, [startTime, endTime, declaredTotalUnits, isFormValid]);
  const onTimeComplete = () => { completedNumericEntry.current = true; };

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
          startTime: formatTimeEntry(startEntry),
          endTime: formatTimeEntry(endEntry),
        },
      });
      const message = syncIssues.length
        ? `Subject saved; could not refresh ${syncIssues.join(' and ')}`
        : editSubjectId ? 'Subject updated' : finish ? 'Schedule saved' : 'Subject added';

      if (finish) {
        DeviceEventEmitter.emit('SHOW_TOAST', message);
        navigation.goBack();
      } else {
        setHasSavedInSession(true);
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
          setStartAmPm('AM');
          setEndAmPm('AM');
          setEndPeriodExplicit(false);
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
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
          pointerEvents={isSaving ? 'none' : 'auto'}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          {termLoadFailed && (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry loading units"
              onPress={() => setTermLoadAttempt(attempt => attempt + 1)} style={styles.loadRetry}>
              <Text style={styles.timeError}>Could not load units. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          {/* Academic Term Section (Always Visible) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Academic Term</Text>

            <View style={styles.termRow}>
              {TERMS.map((term) => {
                const isSelected = semester === term;
                const isDisabled = (!!editSubjectId || hasSavedInSession) && !isSelected;

                return (
                  <TouchableOpacity
                    key={term}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityState={{checked: isSelected, disabled: isDisabled || isSaving}}
                    disabled={isDisabled || isSaving}
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

            {!editSubjectId && (addedCount === 0 || reviewQueue.length > 0) && (
              <View style={styles.enrolledUnitsCard}>
                <View style={styles.unitLabelGroup}>
                  <Text style={styles.inputContextLabel}>Enrolled units</Text>
                  <Text style={styles.inputContextSub}>{reviewQueue.length > 0 ? `Optional · max ${maxUnits}` : `Maximum ${maxUnits}`}</Text>
                </View>
                <View style={styles.enrolledUnitsValue}>
                <TextInput
                  style={styles.inputContext}
                  accessibilityLabel="Enrolled units"
                  placeholder="—"
                  placeholderTextColor={palette.muted}
                  value={declaredTotalUnits}
                  onChangeText={handleDeclaredUnitsChange}
                  onSubmitEditing={() => Keyboard.dismiss()}
                  keyboardType="number-pad"
                  maxLength={2}
                  returnKeyType="done"
                  editable={!isSaving && !isTermLoading}
                />
                <Text style={styles.unitSuffix}>units</Text>
                </View>
                {!!declaredTotalUnits && !isDeclaredLimitValid && (
                  <Text style={[styles.timeError, styles.unitTargetError]} accessibilityLiveRegion="polite">Enter 1–{maxUnits} units.</Text>
                )}
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

                <TextInput
                  style={styles.input}
                  placeholder="Subject Code"
                  placeholderTextColor={palette.muted}
                  value={code}
                  onChangeText={setCode}
                  onSubmitEditing={() => titleRef.current?.focus()}
                  autoCapitalize="characters"
                  returnKeyType="next"
                />

                <TextInput
                  ref={sectionRef}
                  style={styles.input}
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
                  onSubmitEditing={() => isFormValid ? Keyboard.dismiss() : roomRef.current?.focus()}
                  returnKeyType={isFormValid ? 'done' : 'next'}
                />
                <UnitSelector value={units} onChange={selectUnit} disabled={isSaving || isTermLoading} />
                {hasUnitError && (
                  <View style={styles.errorBanner}>
                    <MaterialIcon name="error-outline" size={14} color="#d32f2f" />
                    <Text style={styles.errorText} accessibilityLiveRegion="polite">
                      {isSystemOverload
                        ? `Exceeds ${maxUnits}-unit maximum for ${semester}.`
                        : `Exceeds your declared target of ${declaredTotalUnits} units.`}
                    </Text>
                  </View>
                )}
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
                      <TouchableOpacity key={day.value} accessibilityRole="checkbox" accessibilityLabel={`${day.value} class day`} accessibilityState={{checked: isSelected}} activeOpacity={0.7} onPress={() => toggleDay(day.value)} style={[styles.dayPill, isSelected && styles.dayPillActive]}>
                        <Text style={[styles.dayPillText, isSelected && styles.dayPillTextActive]}>{day.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Time (Optional for TBA)</Text>

                <View style={styles.timeRow}>
                  <TimeField label="Starts" value={startTime} period={startAmPm} onChange={setStartTime}
                    onPeriodChange={setStartAmPm} disabled={isSaving} onComplete={onTimeComplete} onSubmit={() => endTimeRef.current?.focus()} />
                  <View style={styles.timeDivider}><MaterialIcon name="arrow-forward" size={20} color={palette.muted} /></View>
                  <TimeField ref={endTimeRef} label="Ends" value={endTime} period={effectiveEndPeriod} onChange={setEndTime}
                    onPeriodChange={period => { setEndAmPm(period); setEndPeriodExplicit(true); }} disabled={isSaving} onComplete={onTimeComplete} />
                </View>
                {!!logisticsError && <Text style={styles.timeError} accessibilityLiveRegion="polite">{logisticsError}</Text>}
                {needsScanLogisticsReview && <Text style={styles.timeError}>Confirm the scanned days and times.</Text>}
                {!!currentReview?.notes.length && <Text style={styles.timeHint}>{currentReview.notes.join(' ')}</Text>}
                {!!currentReview?.scheduleText && currentReview.fields.length > 0 && (
                  <Text style={styles.scanSource} numberOfLines={4}>Scanned: {currentReview.scheduleText}</Text>
                )}

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
              accessibilityRole="button"
              accessibilityState={{busy: isSaving, disabled: isSaving || !isFormValid}}
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
              {isSaving ? <ActivityIndicator color={palette.surface} style={styles.fabIcon} /> : <MaterialIcon
                name={reviewQueue.length > 1 ? "arrow-forward" : "check"}
                size={24}
                color={isFormValid ? palette.surface : palette.muted}
                style={styles.fabIcon}
              />}
              <Text style={[styles.fabSaveText, !isFormValid && styles.textMuted]}>
                {isSaving ? 'Saving…' : isDeclaredUnitLimitReached
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

        <Modal visible={customAlert.visible} transparent animationType="fade" onRequestClose={closeAlert}>
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
  timeHint: {fontSize: 11, color: palette.muted, lineHeight: 17},
  timeError: {fontSize: 12, color: '#B3261E', lineHeight: 18, marginTop: 8},
  scanSource: {fontSize: 11, color: palette.body, lineHeight: 17, marginTop: 8},
  loadRetry: {minHeight: 44, justifyContent: 'center', marginBottom: 12},
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

  enrolledUnitsCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 18, padding: 16 },
  unitLabelGroup: {flexGrow: 1},
  enrolledUnitsValue: {flexDirection: 'row', alignItems: 'center', gap: 8},
  unitSuffix: {fontSize: 13, color: palette.muted},
  unitTargetError: {width: '100%', marginTop: 0},
  inputContextLabel: { fontSize: 15, fontWeight: '600', color: palette.ink },
  inputContextSub: { fontSize: 12, color: palette.muted, fontWeight: '500', marginTop: 2 },
  inputContext: { fontSize: 22, fontWeight: '700', color: palette.primary, backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, textAlign: 'center', minWidth: 64, minHeight: 48 },

  // NEW COMPLETION STATE STYLES
  completionStateContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, backgroundColor: 'rgba(197, 160, 89, 0.05)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(197, 160, 89, 0.2)', marginTop: spacing.md },
  completionIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(197, 160, 89, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  completionTitle: { fontSize: 22, fontWeight: '800', color: palette.ink, marginBottom: spacing.sm, letterSpacing: -0.5 },
  completionSubtitle: { fontSize: 15, color: palette.body, textAlign: 'center', lineHeight: 22 },

  errorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 },
  errorText: { color: '#d32f2f', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  input: { backgroundColor: 'rgba(28, 28, 30, 0.04)', borderRadius: 16, paddingHorizontal: 20, height: 56, fontSize: 16, fontWeight: '500', color: palette.ink, marginBottom: spacing.md },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayPill: { flex: 1, maxWidth: 44, marginHorizontal: 1, height: 40, borderRadius: 20, backgroundColor: 'rgba(28, 28, 30, 0.04)', justifyContent: 'center', alignItems: 'center' },
  dayPillActive: { backgroundColor: palette.primary },
  dayPillText: { fontSize: 15, fontWeight: '600', color: palette.ink },
  dayPillTextActive: { color: palette.surface },

  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  timeDivider: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2 },

  bottomWrapper: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', backgroundColor: palette.bg, paddingTop: 10 },
  addAnotherButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingVertical: 4, paddingHorizontal: spacing.md },
  addAnotherText: { color: palette.primary, fontSize: 15, fontWeight: '700', marginLeft: 4 },
  addAnotherDisabled: { opacity: 0.5 },
  textMuted: { color: palette.muted },
  fabSave: { minHeight: 64, maxWidth: '90%', borderRadius: 32, backgroundColor: palette.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 14, shadowColor: palette.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 6 },
  fabSaveDisabled: { backgroundColor: 'rgba(28, 28, 30, 0.08)', shadowOpacity: 0, elevation: 0 },
  fabIcon: { marginRight: spacing.sm },
  fabSaveText: { color: palette.surface, fontSize: 18, fontWeight: '700', flexShrink: 1, textAlign: 'center' },

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
