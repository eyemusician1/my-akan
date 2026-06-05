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
  TouchableWithoutFeedback,
  Keyboard,
  LayoutAnimation,
  UIManager,
  Modal
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Q } from '@nozbe/watermelondb';

import { palette, spacing } from '../tokens';
import { database } from '../core/database';
import Schedule from '../core/database/models/Schedule';
import Subject from '../core/database/models/Subject';

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

const timeToDecimal = (time: string, period: string) => {
  let [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
  return hours + (minutes / 60);
};

export function ManualEntryScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();

  const editSubjectId = route?.params?.editSubjectId;

  // --- SCANNER QUEUE STATE ---
  const initialQueue = route?.params?.extractedSubjects || [];
  const [reviewQueue, setReviewQueue] = useState<any[]>(initialQueue);
  const totalScanned = useRef(initialQueue.length).current;

  const [semester, setSemester] = useState('1st Sem');
  const [totalSubjects, setTotalSubjects] = useState('');

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

  const maxUnits = semester === 'Summer' ? 6 : 24;

  const isOverload = editSubjectId
    ? (totalAddedUnits - originalUnits + units) > maxUnits
    : (totalAddedUnits + units) > maxUnits;

  const parsedLimit = parseInt(totalSubjects, 10);
  const isSubjectLimitReached = !editSubjectId && !isNaN(parsedLimit) && addedCount >= parsedLimit;

  // --- POPULATE FROM QUEUE OR EDIT ---
  useEffect(() => {
    if (editSubjectId) {
      const loadSubject = async () => {
        try {
          const subject = await database.get<Subject>('subjects').find(editSubjectId);
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

          let [sTime, sAmPm] = subject.startTime.split(' ');
          if (sTime.length === 4) sTime = `0${sTime}`;
          setStartTime(sTime);
          setStartAmPm(sAmPm as any);

          let [eTime, eAmPm] = subject.endTime.split(' ');
          if (eTime.length === 4) eTime = `0${eTime}`;
          setEndTime(eTime);
          setEndAmPm(eAmPm as any);
        } catch (e) {
          console.error("Failed to load subject", e);
        }
      };
      loadSubject();
    } else if (reviewQueue.length > 0) {
      // PRE-FILL FROM SCANNER QUEUE
      const current = reviewQueue[0];
      setCode(current.code || '');
      setSection(current.section || '');
      setTitle(current.title || '');
      setUnits(current.units || 3);
      setRoom(current.room || '');
      setInstructor(current.instructor || '');
      setSelectedDays(current.days || []);

      if (current.startTime) {
        let [sTime, sAmPm] = current.startTime.split(' ');
        if (sTime.length === 4) sTime = `0${sTime}`;
        setStartTime(sTime);
        setStartAmPm(sAmPm as any);
      } else {
        setStartTime('');
        setStartAmPm('AM');
      }

      if (current.endTime) {
        let [eTime, eAmPm] = current.endTime.split(' ');
        if (eTime.length === 4) eTime = `0${eTime}`;
        setEndTime(eTime);
        setEndAmPm(eAmPm as any);
      } else {
        setEndTime('');
        setEndAmPm('AM');
      }
    }
  }, [editSubjectId, reviewQueue]);

  useEffect(() => {
    if (editSubjectId) return;

    const initRecentTerm = async () => {
      const recent = await database.get<Schedule>('schedules').query(Q.sortBy('created_at', Q.desc)).fetch();
      if (recent.length > 0) {
        setSemester(recent[0].academicTerm);
      }
    };
    initRecentTerm();
  }, [editSubjectId]);

  useEffect(() => {
    if (editSubjectId) return;

    let isMounted = true;
    const loadTermData = async () => {
      try {
        const schedules = await database.get<Schedule>('schedules').query(Q.where('academic_term', semester)).fetch();
        if (schedules.length > 0 && isMounted) {
          const sch = schedules[0];
          const subjects = await sch.subjects.fetch();

          setTotalSubjects(sch.totalSubjects ? sch.totalSubjects.toString() : '');
          setAddedCount(subjects.length);

          const totalU = subjects.reduce((sum: number, s: Subject) => sum + s.units, 0);
          setTotalAddedUnits(totalU);
        } else if (isMounted) {
          setTotalSubjects('');
          setAddedCount(0);
          setTotalAddedUnits(0);
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadTermData();
    return () => { isMounted = false; };
  }, [semester, editSubjectId]);

  const handleTermChange = (term: string) => {
    Keyboard.dismiss();
    if (term !== semester) setSemester(term);
  };

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

  // FIXED: If we are reviewing a scan queue, totalSubjects is bypassed so the button lights up!
  const isFormValid =
    (editSubjectId || reviewQueue.length > 0 ? true : totalSubjects.trim().length > 0) &&
    code.trim().length > 0 &&
    section.trim().length > 0 &&
    title.trim().length > 0 &&
    room.trim().length > 0 &&
    instructor.trim().length > 0 &&
    selectedDays.length > 0 &&
    startTime.length === 5 &&
    endTime.length === 5 &&
    !isOverload &&
    !isSubjectLimitReached;

  const canAddAnother =
    isFormValid &&
    (totalAddedUnits + units < maxUnits) &&
    (addedCount + 1 < parsedLimit || isNaN(parsedLimit));

  const checkTimeConflict = async () => {
    const newStart = timeToDecimal(startTime, startAmPm);
    const newEnd = timeToDecimal(endTime, endAmPm);

    if (newStart >= newEnd) {
      setCustomAlert({ visible: true, title: "Invalid Time", message: "The end time must be later than the start time." });
      return true;
    }

    const schedules = await database.get<Schedule>('schedules').query(Q.where('academic_term', semester)).fetch();
    if (schedules.length === 0) return false;

    const subjects = await schedules[0].subjects.fetch();

    for (const subj of subjects) {
      if (editSubjectId && subj.id === editSubjectId) continue;

      const hasSharedDays = selectedDays.some(d => subj.days.includes(d));
      if (!hasSharedDays) continue;

      const [sTime, sPeriod] = subj.startTime.split(' ');
      const [eTime, ePeriod] = subj.endTime.split(' ');

      const existStart = timeToDecimal(sTime, sPeriod);
      const existEnd = timeToDecimal(eTime, ePeriod);

      if (newStart < existEnd && newEnd > existStart) {
        setCustomAlert({
          visible: true,
          title: "Schedule Conflict",
          message: `This time overlaps with ${subj.code} (${subj.startTime} - ${subj.endTime}) on shared days. Please adjust the time.`
        });
        return true;
      }
    }
    return false;
  };

  const saveToDatabase = async () => {
    await database.write(async () => {
      const schedules = await database.get<Schedule>('schedules').query(Q.where('academic_term', semester)).fetch();
      let currentSchedule = schedules[0];

      if (!currentSchedule) {
        currentSchedule = await database.get<Schedule>('schedules').create((sch: any) => {
            sch.academicTerm = semester;
            if (totalSubjects) sch.totalSubjects = parseInt(totalSubjects, 10);
          });
      }

      if (editSubjectId) {
        const subjectToUpdate = await database.get<Subject>('subjects').find(editSubjectId);
        const oldSchedule = await subjectToUpdate.schedule.fetch();

        await subjectToUpdate.update((subj: any) => {
          subj.schedule.set(currentSchedule);
          subj.code = code;
          subj.section = section;
          subj.title = title;
          subj.units = units;
          subj.room = room;
          subj.instructor = instructor;
          subj.days = selectedDays;
          subj.startTime = `${startTime} ${startAmPm}`;
          subj.endTime = `${endTime} ${endAmPm}`;
        });

        if (oldSchedule.id !== currentSchedule.id) {
          const count = await oldSchedule.subjects.fetchCount();
          if (count === 0) await oldSchedule.destroyPermanently();
        }
      } else {
        await database.get<Subject>('subjects').create((subj: any) => {
          subj.schedule.set(currentSchedule);
          subj.code = code;
          subj.section = section;
          subj.title = title;
          subj.units = units;
          subj.room = room;
          subj.instructor = instructor;
          subj.days = selectedDays;
          subj.startTime = `${startTime} ${startAmPm}`;
          subj.endTime = `${endTime} ${endAmPm}`;
        });
      }
    });
  };

  const handleSaveAndAddAnother = async () => {
    Keyboard.dismiss();
    const hasConflict = await checkTimeConflict();
    if (hasConflict) return;

    await saveToDatabase();
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
  };

  const handleSaveAndFinish = async () => {
    Keyboard.dismiss();
    const hasConflict = await checkTimeConflict();
    if (hasConflict) return;

    await saveToDatabase();
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>

          <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
            <TouchableOpacity style={styles.backButton} onPress={() => { Keyboard.dismiss(); navigation.goBack(); }}>
              <MaterialIcon name="arrow-back" size={24} color={palette.ink} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{editSubjectId ? 'Edit Subject' : reviewQueue.length > 0 ? 'Review Scans' : 'New Schedule'}</Text>
            <View style={styles.headerRight} />
          </View>

          {/* DYNAMIC BANNERS */}
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
                {addedCount} {totalSubjects ? `of ${totalSubjects}` : ''} subjects • {totalAddedUnits}/{maxUnits} Units
              </Text>
            </View>
          )}

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >

            <View style={styles.section} pointerEvents={reviewQueue.length > 0 ? 'none' : 'auto'}>
              <Text style={styles.sectionLabel}>Academic Term</Text>

              <View style={[styles.termRow, reviewQueue.length > 0 && { opacity: 0.5 }]}>
                {TERMS.map((term) => {
                  const isSelected = semester === term;
                  const isDisabled = addedCount > 0 && !isSelected;

                  return (
                    <TouchableOpacity
                      key={term}
                      activeOpacity={0.7}
                      disabled={isDisabled}
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
                  <Text style={styles.inputContextLabel}>Total Enrolled Subjects</Text>
                  <TextInput
                    style={styles.inputContext}
                    placeholder="e.g. 8"
                    placeholderTextColor={palette.muted}
                    value={totalSubjects}
                    onChangeText={handleTotalSubjectsChange}
                    keyboardType="number-pad"
                    maxLength={2}
                    returnKeyType="done"
                  />
                </View>
              )}
            </View>

            <View pointerEvents={isSubjectLimitReached ? 'none' : 'auto'} style={[isSubjectLimitReached && styles.disabledSection]}>
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

                  <TouchableOpacity style={[styles.unitDropdownToggle, isOverload && styles.unitDropdownError]} activeOpacity={0.7} onPress={toggleUnitsDropdown}>
                    <Text style={[styles.unitDropdownText, isOverload && styles.textError]}>{units} Units</Text>
                    <MaterialIcon name={isUnitsOpen ? "arrow-drop-up" : "arrow-drop-down"} size={24} color={isOverload ? '#d32f2f' : palette.ink} />
                  </TouchableOpacity>
                </View>

                {isOverload && (
                  <View style={styles.errorBanner}>
                    <MaterialIcon name="error-outline" size={14} color="#d32f2f" />
                    <Text style={styles.errorText}>Exceeds {maxUnits} unit maximum for {semester}.</Text>
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
                      <TouchableOpacity key={day.value} activeOpacity={0.7} onPress={() => toggleDay(day.value)} style={[styles.dayPill, isSelected && styles.dayPillActive]}>
                        <Text style={[styles.dayPillText, isSelected && styles.dayPillTextActive]}>{day.label}</Text>
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
                        onChangeText={(text) => {
                          const formatted = formatTimeInput(text);
                          setStartTime(formatted);
                          if (formatted.length === 5) Keyboard.dismiss();
                        }}
                        placeholder="08:30"
                        placeholderTextColor={palette.muted}
                        keyboardType="number-pad"
                        maxLength={5}
                        returnKeyType="done"
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
                        style={styles.timeValueInput}
                        value={endTime}
                        onChangeText={(text) => {
                          const formatted = formatTimeInput(text);
                          setEndTime(formatted);
                          if (formatted.length === 5) Keyboard.dismiss();
                        }}
                        placeholder="10:00"
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

          </ScrollView>

          {/* DYNAMIC ACTION BUTTONS */}
          <View style={[styles.bottomWrapper, { paddingBottom: insets.bottom + spacing.xl }]}>

            {/* Show "Add Another" ONLY if we are manually entering, NOT reviewing a scan queue */}
            {!editSubjectId && reviewQueue.length === 0 && (
              <TouchableOpacity
                style={[styles.addAnotherButton, !canAddAnother && styles.addAnotherDisabled]}
                activeOpacity={0.7}
                disabled={!canAddAnother}
                onPress={handleSaveAndAddAnother}
              >
                <MaterialIcon name="add" size={20} color={canAddAnother ? palette.primary : palette.muted} />
                <Text style={[styles.addAnotherText, !canAddAnother && styles.textMuted]}>Save & Add Another</Text>
              </TouchableOpacity>
            )}

            {/* Smart FAB that acts as 'Next' during a scan, and 'Finish' at the end */}
            <TouchableOpacity
              style={[styles.fabSave, !isFormValid && styles.fabSaveDisabled]}
              activeOpacity={0.9}
              disabled={!isFormValid}
              onPress={() => {
                if (reviewQueue.length > 1) {
                  handleSaveAndAddAnother(); // Shifts to the next subject in queue
                } else {
                  handleSaveAndFinish(); // Finishes queue and exits
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
                {editSubjectId
                  ? 'Update Subject'
                  : reviewQueue.length > 1
                    ? 'Save & Next Subject'
                    : reviewQueue.length === 1
                      ? 'Save & Finish Queue'
                      : 'Save & Finish'}
              </Text>
            </TouchableOpacity>
          </View>

          <Modal visible={customAlert.visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.alertModalContent}>
                <View style={styles.alertIconContainer}>
                  <MaterialIcon name="event-busy" size={32} color={palette.primary} />
                </View>
                <Text style={styles.alertModalTitle}>{customAlert.title}</Text>
                <Text style={styles.alertMessage}>{customAlert.message}</Text>

                <TouchableOpacity style={styles.alertButton} onPress={closeAlert}>
                  <Text style={styles.alertButtonText}>Got it</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

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

  scannerBanner: { backgroundColor: '#C5A059', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, marginHorizontal: spacing.xl, borderRadius: 12, marginBottom: spacing.md },
  scannerBannerText: { color: palette.surface, fontSize: 13, fontWeight: '600', marginLeft: 6 },

  progressBanner: { backgroundColor: palette.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, marginHorizontal: spacing.xl, borderRadius: 12, marginBottom: spacing.md },
  progressText: { color: palette.surface, fontSize: 13, fontWeight: '600', marginLeft: 6 },

  scrollContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 400 },
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

  disabledSection: { opacity: 0.4 },

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

  timeValueInput: {
    fontSize: 18, color: palette.ink, fontWeight: '700', textAlign: 'center', paddingVertical: 4, paddingHorizontal: 0, margin: 0, marginRight: 6, minWidth: 72, height: 38,
  },

  amPmToggle: { backgroundColor: 'rgba(28, 28, 30, 0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  amPmText: { fontSize: 14, fontWeight: '700', color: palette.primary },
  timeDivider: { paddingHorizontal: spacing.md },

  bottomWrapper: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', backgroundColor: palette.bg, paddingTop: spacing.md },
  addAnotherButton: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  addAnotherText: { color: palette.primary, fontSize: 15, fontWeight: '700', marginLeft: 4 },

  addAnotherDisabled: { opacity: 0.5 },
  textMuted: { color: palette.muted },

  fabSave: { height: 64, borderRadius: 32, backgroundColor: palette.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 48, shadowColor: palette.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 6 },
  fabSaveDisabled: { backgroundColor: 'rgba(28, 28, 30, 0.08)', shadowOpacity: 0, elevation: 0 },
  fabIcon: { marginRight: spacing.sm },
  fabSaveText: { color: palette.surface, fontSize: 18, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  alertModalContent: { backgroundColor: palette.surface, borderRadius: 28, padding: spacing.xl, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  alertIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(122, 28, 28, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  alertModalTitle: { fontSize: 20, fontWeight: '700', color: palette.ink, marginBottom: spacing.sm, textAlign: 'center' },
  alertMessage: { fontSize: 15, color: palette.body, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl, paddingHorizontal: spacing.sm },
  alertButton: { width: '100%', height: 52, borderRadius: 26, backgroundColor: palette.primary, justifyContent: 'center', alignItems: 'center' },
  alertButtonText: { fontSize: 16, fontWeight: '600', color: palette.surface },
});