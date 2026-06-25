import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import withObservables from '@nozbe/with-observables';

import { palette, spacing } from '../tokens';
import { database } from '../core/database';
import Subject from '../core/database/models/Subject';
import Schedule from '../core/database/models/Schedule';

interface ProfileScreenProps {
  navigation: any;
  subjects: Subject[];
  schedules: Schedule[];
}

const COLLEGES = [
  "College of Agriculture (COA)",
  "College of Business Administration and Accountancy (CBAA)",
  "College of Education (CED)",
  "College of Engineering (COE)",
  "College of Fisheries and Aquatic Sciences (CFAS)",
  "College of Forestry and Environmental Studies (CFES)",
  "College of Health Sciences (CHS)",
  "College of Hospitality and Tourism Management (CHTM)",
  "College of Information and Computing Sciences (CICS)",
  "College of Law (COL)",
  "College of Medicine (COM)",
  "College of Natural Sciences and Mathematics (CNSM)",
  "College of Public Affairs (CPA)",
  "College of Social Sciences and Humanities (CSSH)",
  "College of Sports, Physical Education and Recreation (CSPEAR)",
  "King Faisal Center for Islamic, Arabic and Asian Studies (KFCIAAS)",
  "Graduate Studies (GS)"
];

const YEAR_LEVELS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior"
];

const ProfileScreenUI = ({ navigation, subjects, schedules }: ProfileScreenProps) => {
  const insets = useSafeAreaInsets();

  // --- STATE MANAGEMENT ---
  const [profile, setProfile] = useState({
    name: 'Student',
    yearLevel: 'Freshman',
    studentId: '202200000',
    college: 'College of Information and Computing Sciences (CICS)',
    course: 'BS Information Technology'
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCollegePickerOpen, setIsCollegePickerOpen] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);

  const [collegeSearch, setCollegeSearch] = useState('');
  const [editForm, setEditForm] = useState(profile);

  // --- FETCH SAVED DATA ON LOAD ---
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const storedName = await AsyncStorage.getItem('@user_name');
        const storedYear = await AsyncStorage.getItem('@user_year');
        const storedId = await AsyncStorage.getItem('@user_id');
        const storedCollege = await AsyncStorage.getItem('@user_college');
        const storedCourse = await AsyncStorage.getItem('@user_course');

        const loadedProfile = {
          name: storedName || 'Student',
          yearLevel: storedYear || 'Freshman',
          studentId: storedId || '202200000',
          college: storedCollege || 'Select your college',
          course: storedCourse || 'Set your course'
        };

        setProfile(loadedProfile);
        setEditForm(loadedProfile);
      } catch (e) {
        console.error("Failed to load profile data", e);
      }
    };
    fetchProfileData();
  }, []);

  // --- SAVE UPDATED DATA (REAL-TIME UI SYNC) ---
  const handleSaveProfile = async () => {
    try {
      await AsyncStorage.setItem('@user_name', editForm.name);
      await AsyncStorage.setItem('@user_year', editForm.yearLevel);
      await AsyncStorage.setItem('@user_id', editForm.studentId);
      await AsyncStorage.setItem('@user_course', editForm.course);

      // Deep copy ensures React Native detects the change and updates UI instantly
      setProfile({ ...editForm });
      setIsEditModalOpen(false);
    } catch (e) {
      console.error("Failed to save profile data", e);
    }
  };

  const handleCollegeSelect = async (selectedCollege: string) => {
    try {
      await AsyncStorage.setItem('@user_college', selectedCollege);
      setProfile({ ...profile, college: selectedCollege });
      setEditForm({ ...editForm, college: selectedCollege });
      setIsCollegePickerOpen(false);
    } catch (e) {
      console.error("Failed to save college", e);
    }
  };

  const filteredColleges = COLLEGES.filter(c =>
    c.toLowerCase().includes(collegeSearch.toLowerCase())
  );

  const activeUnits = subjects.reduce((sum: number, subj: Subject) => sum + subj.units, 0);
  const activeClasses = subjects.length;
  const activeTerms = schedules.length;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcon name="arrow-back" size={24} color={palette.ink} />
        </TouchableOpacity>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* M3 MASSIVE HERO SECTION */}
        <View style={styles.heroSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.studentName} numberOfLines={1} adjustsFontSizeToFit>{profile.name}</Text>
          <Text style={styles.studentCourse}>{profile.course}</Text>

          <View style={styles.heroPillContainer}>
            <View style={styles.heroPill}>
              <MaterialIcon name="school" size={14} color={palette.body} style={{ marginRight: 6 }} />
              <Text style={styles.heroPillText}>{profile.yearLevel}</Text>
            </View>
            <View style={styles.heroPill}>
              <MaterialIcon name="badge" size={14} color={palette.body} style={{ marginRight: 6 }} />
              <Text style={styles.heroPillText}>{profile.studentId}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.m3EditButton}
            activeOpacity={0.8}
            onPress={() => { setEditForm(profile); setIsEditModalOpen(true); }}
          >
            <MaterialIcon name="edit" size={18} color={palette.ink} />
            <Text style={styles.m3EditButtonText}>Manage Profile</Text>
          </TouchableOpacity>
        </View>

        {/* M3 OVERVIEW STATS */}
        <Text style={styles.sectionLabel}>Overview</Text>
        <View style={styles.unifiedCard}>
          <View style={styles.statColumn}>
            <Text style={styles.statValue}>{activeUnits}</Text>
            <Text style={styles.statLabel}>Enrolled Units</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.statColumn}>
            <Text style={styles.statValue}>{activeClasses}</Text>
            <Text style={styles.statLabel}>Total Subjects</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.statColumn}>
            <Text style={styles.statValue}>{activeTerms}</Text>
            <Text style={styles.statLabel}>Semesters</Text>
          </View>
        </View>

        {/* M3 INSTITUTION CARD */}
        <Text style={styles.sectionLabel}>Institution</Text>
        <View style={[styles.unifiedCard, { paddingVertical: spacing.md }]}>
          <View style={styles.infoRow}>
            <View style={styles.logoWrapper}>
              <Image source={require('../../assets/images/msuLogo.png')} style={styles.institutionLogo} resizeMode="contain" />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoTitle}>University</Text>
              <Text style={styles.infoSubtitle}>Mindanao State University</Text>

              <View style={styles.horizontalDividerLite} />

              <Text style={styles.infoTitle}>College</Text>
              <TouchableOpacity
                style={styles.inlineDropdownTrigger}
                activeOpacity={0.6}
                onPress={() => { setCollegeSearch(''); setIsCollegePickerOpen(true); }}
              >
                <Text style={[styles.infoSubtitle, profile.college === 'Select your college' && styles.textMuted, { flex: 1, paddingRight: spacing.sm }]}>
                  {profile.college}
                </Text>
                <MaterialIcon name="arrow-drop-down" size={28} color={palette.ink} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SETTINGS LIST */}
        <Text style={styles.sectionLabel}>System</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity style={styles.optionRow} activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <MaterialIcon name="picture-as-pdf" size={26} color={palette.ink} />
              <Text style={styles.optionText}>Export Schedule to PDF</Text>
            </View>
            <MaterialIcon name="chevron-right" size={24} color={palette.muted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* --- M3 FULL SCREEN EDIT MODAL --- */}
      <Modal visible={isEditModalOpen} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlayEdit}>
            <View style={styles.modalContentEdit}>

              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                  <MaterialIcon name="close" size={28} color={palette.ink} />
                </TouchableOpacity>
                <Text style={styles.modalTitleCenter}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSaveProfile}>
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editForm.name}
                    onChangeText={(text) => setEditForm({...editForm, name: text})}
                    placeholder="e.g. Sayr"
                    placeholderTextColor={palette.muted}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Course</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editForm.course}
                    onChangeText={(text) => setEditForm({...editForm, course: text})}
                    placeholder="e.g. BS Information Technology"
                    placeholderTextColor={palette.muted}
                    autoCapitalize="words"
                  />
                </View>

                {/* --- M3 INLINE CHIP GROUP FOR YEAR LEVEL --- */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Year Level</Text>
                  <View style={styles.chipRow}>
                    {YEAR_LEVELS.map((year) => {
                      const isActive = editForm.yearLevel === year;
                      return (
                        <TouchableOpacity
                          key={year}
                          activeOpacity={0.8}
                          onPress={() => setEditForm({ ...editForm, yearLevel: year })}
                          style={[styles.chip, isActive && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                            {year}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* NUMERIC, 9-DIGIT CAPPED STUDENT ID */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Student ID</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editForm.studentId}
                    onChangeText={(text) => setEditForm({...editForm, studentId: text.replace(/[^0-9]/g, '')})}
                    placeholder="e.g. 202212345"
                    placeholderTextColor={palette.muted}
                    keyboardType="number-pad"
                    maxLength={9}
                  />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- COLLEGE M3 BOTTOM SHEET --- */}
      <Modal visible={isCollegePickerOpen} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.pickerOverlay}>
            <View style={styles.pickerContent}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select College</Text>
                <TouchableOpacity onPress={() => setIsCollegePickerOpen(false)}>
                  <MaterialIcon name="close" size={28} color={palette.ink} />
                </TouchableOpacity>
              </View>

              <View style={styles.searchBar}>
                <MaterialIcon name="search" size={24} color={palette.muted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search colleges..."
                  placeholderTextColor={palette.muted}
                  value={collegeSearch}
                  onChangeText={setCollegeSearch}
                  autoCorrect={false}
                />
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {filteredColleges.length === 0 ? (
                  <Text style={styles.noResultsText}>No colleges found.</Text>
                ) : (
                  filteredColleges.map((college, index) => (
                    <TouchableOpacity key={index} style={styles.collegeItem} onPress={() => handleCollegeSelect(college)}>
                      <Text style={styles.collegeItemText}>{college}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
};

export const ProfileScreen = withObservables([], () => ({
  subjects: database.get<Subject>('subjects').query().observe(),
  schedules: database.get<Schedule>('schedules').query().observe(),
}))(ProfileScreenUI);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  backButton: { padding: spacing.sm },
  headerRight: { width: 40 },

  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },

  // M3 Hero Section
  heroSection: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: palette.primary, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  avatarText: { fontSize: 44, fontWeight: '400', color: palette.surface },
  studentName: { fontSize: 32, fontWeight: '700', color: palette.ink, marginBottom: 6, letterSpacing: -0.8 },
  studentCourse: { fontSize: 16, fontWeight: '500', color: palette.muted, marginBottom: spacing.lg, textAlign: 'center' },

  heroPillContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.xl },
  heroPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(28,28,30,0.06)' },
  heroPillText: { fontSize: 14, fontWeight: '600', color: palette.body },

  m3EditButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(197, 160, 89, 0.15)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100 },
  m3EditButtonText: { fontSize: 15, fontWeight: '700', color: palette.ink, marginLeft: 8 },

  sectionLabel: { fontSize: 14, fontWeight: '700', color: palette.ink, marginBottom: spacing.md, marginLeft: 4, opacity: 0.7, letterSpacing: 0.5, textTransform: 'uppercase' },

  unifiedCard: { backgroundColor: palette.surface, borderRadius: 28, padding: spacing.lg, marginBottom: spacing.xxl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },

  statColumn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 28, fontWeight: '700', color: palette.ink, marginBottom: 2 },
  statLabel: { fontSize: 13, fontWeight: '500', color: palette.muted, textAlign: 'center' },
  verticalDivider: { width: 1, height: 40, backgroundColor: palette.border },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', width: '100%' },
  logoWrapper: { marginRight: spacing.md, marginTop: 4 },
  institutionLogo: { width: 56, height: 56 },
  infoTextGroup: { flex: 1 },
  infoTitle: { fontSize: 13, fontWeight: '600', color: palette.muted, marginBottom: 2 },
  infoSubtitle: { fontSize: 17, fontWeight: '600', color: palette.ink },
  horizontalDividerLite: { height: 1, backgroundColor: palette.border, marginVertical: spacing.md, width: '100%' },

  inlineDropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: 'rgba(28,28,30,0.04)', borderRadius: 16, marginLeft: -16 },
  textMuted: { color: palette.muted },

  optionsContainer: { backgroundColor: palette.surface, borderRadius: 28, paddingHorizontal: spacing.lg, paddingVertical: 8, marginBottom: spacing.xxl },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
  optionLeft: { flexDirection: 'row', alignItems: 'center' },
  optionText: { fontSize: 17, fontWeight: '600', color: palette.ink, marginLeft: spacing.md },
  horizontalDivider: { height: 1, backgroundColor: palette.border, marginLeft: 46 },

  // --- M3 FULL SCREEN EDIT MODAL ---
  modalOverlayEdit: { flex: 1, backgroundColor: palette.bg, justifyContent: 'flex-end' },
  modalContentEdit: { flex: 1, backgroundColor: palette.bg, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: spacing.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxl, paddingTop: spacing.md },
  modalTitleCenter: { fontSize: 20, fontWeight: '700', color: palette.ink },
  modalSaveText: { fontSize: 18, fontWeight: '700', color: palette.primary },

  inputGroup: { marginBottom: spacing.lg },
  inputLabel: { fontSize: 14, fontWeight: '600', color: palette.muted, marginBottom: 8, marginLeft: 4 },
  modalInput: { backgroundColor: 'rgba(28,28,30,0.04)', borderRadius: 20, paddingHorizontal: 20, height: 60, fontSize: 17, color: palette.ink, fontWeight: '600' },

  // --- M3 INLINE CHIP GROUP ---
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { backgroundColor: 'rgba(28,28,30,0.04)', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 20 },
  chipActive: { backgroundColor: palette.primary },
  chipText: { fontSize: 15, fontWeight: '600', color: palette.ink },
  chipTextActive: { color: palette.surface },

  // --- M3 COLLEGE BOTTOM SHEET ---
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerContent: { backgroundColor: palette.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '85%', padding: spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  pickerTitle: { fontSize: 24, fontWeight: '700', color: palette.ink },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, borderRadius: 20, paddingHorizontal: 16, height: 60, marginBottom: spacing.lg },
  searchInput: { flex: 1, fontSize: 17, color: palette.ink, marginLeft: spacing.sm, fontWeight: '500' },
  collegeItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  collegeItemText: { fontSize: 16, color: palette.ink, fontWeight: '500', lineHeight: 24 },
  noResultsText: { textAlign: 'center', marginTop: spacing.xl, color: palette.muted, fontSize: 16 }
});