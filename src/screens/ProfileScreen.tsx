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

const ProfileScreenUI = ({ navigation, subjects, schedules }: ProfileScreenProps) => {
  const insets = useSafeAreaInsets();

  // --- STATE MANAGEMENT ---
  const [profile, setProfile] = useState({
    name: 'Student',
    yearLevel: '4th Year',
    studentId: '2022-XXXXX',
    college: 'College of Information and Computing Sciences (CICS)'
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCollegePickerOpen, setIsCollegePickerOpen] = useState(false);
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

        const loadedProfile = {
          name: storedName || 'Student',
          yearLevel: storedYear || '4th Year',
          studentId: storedId || '2022-XXXXX',
          college: storedCollege || 'Select your college'
        };

        setProfile(loadedProfile);
        setEditForm(loadedProfile);
      } catch (e) {
        console.error("Failed to load profile data", e);
      }
    };
    fetchProfileData();
  }, []);

  // --- SAVE UPDATED DATA (Name, Year, ID) ---
  const handleSaveProfile = async () => {
    try {
      await AsyncStorage.setItem('@user_name', editForm.name);
      await AsyncStorage.setItem('@user_year', editForm.yearLevel);
      await AsyncStorage.setItem('@user_id', editForm.studentId);

      setProfile(editForm);
      setIsEditModalOpen(false);
    } catch (e) {
      console.error("Failed to save profile data", e);
    }
  };

  // --- SAVE COLLEGE INSTANTLY ---
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

  // --- REAL-TIME ACADEMIC CALCULATIONS ---
  const activeUnits = subjects.reduce((sum: number, subj: Subject) => sum + subj.units, 0);
  const activeClasses = subjects.length;
  const activeTerms = schedules.length;

  const staticDetails = {
    course: 'BS Information Technology',
    university: 'Mindanao State University',
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcon name="arrow-back" size={24} color={palette.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* GOOGLE-STYLE HERO SECTION */}
        <View style={styles.heroSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.studentName}>{profile.name}</Text>
          <Text style={styles.studentCourse}>{staticDetails.course}</Text>

          <View style={styles.heroPillContainer}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{profile.yearLevel}</Text>
            </View>
            <View style={styles.heroPillDot} />
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{profile.studentId}</Text>
            </View>
          </View>
        </View>

        {/* UNIFIED ACADEMIC OVERVIEW CARD */}
        <Text style={styles.sectionLabel}>Academic Overview</Text>
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
            <Text style={styles.statLabel}>Terms Tracked</Text>
          </View>
        </View>

        {/* INSTITUTION WITH LOGO & INLINE COLLEGE DROPDOWN */}
        <Text style={styles.sectionLabel}>Institution</Text>
        <View style={styles.unifiedCard}>
          <View style={styles.infoRow}>
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../assets/images/msuLogo.png')}
                style={styles.institutionLogo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoTitle}>University</Text>
              <Text style={styles.infoSubtitle}>{staticDetails.university}</Text>

              <View style={styles.horizontalDividerLite} />

              <Text style={styles.infoTitle}>College</Text>

              {/* --- SUBTLE INLINE DROPDOWN TRIGGER --- */}
              <TouchableOpacity
                style={styles.inlineDropdownTrigger}
                activeOpacity={0.6}
                onPress={() => {
                  setCollegeSearch('');
                  setIsCollegePickerOpen(true);
                }}
              >
                <Text style={[styles.infoSubtitle, profile.college === 'Select your college' && styles.textMuted, { flex: 1, paddingRight: spacing.sm }]}>
                  {profile.college}
                </Text>
                <MaterialIcon name="arrow-drop-down" size={24} color={palette.ink} />
              </TouchableOpacity>

            </View>
          </View>
        </View>

        {/* ACCOUNT SETTINGS OPTIONS */}
        <Text style={styles.sectionLabel}>Account Options</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={() => {
              setEditForm(profile);
              setIsEditModalOpen(true);
            }}
          >
            <View style={styles.optionLeft}>
              <MaterialIcon name="person-outline" size={24} color={palette.body} />
              <Text style={styles.optionText}>Edit Profile Details</Text>
            </View>
            <MaterialIcon name="chevron-right" size={24} color={palette.muted} />
          </TouchableOpacity>

          <View style={styles.horizontalDivider} />

          <TouchableOpacity style={styles.optionRow} activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <MaterialIcon name="picture-as-pdf" size={24} color={palette.body} />
              <Text style={styles.optionText}>Export Schedule to PDF</Text>
            </View>
            <MaterialIcon name="chevron-right" size={24} color={palette.muted} />
          </TouchableOpacity>

          <View style={styles.horizontalDivider} />

          <TouchableOpacity style={styles.optionRow} activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <MaterialIcon name="cloud-sync" size={24} color={palette.body} />
              <Text style={styles.optionText}>Data & Backup</Text>
            </View>
            <MaterialIcon name="chevron-right" size={24} color={palette.muted} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* --- EDIT PROFILE MODAL --- */}
      <Modal visible={isEditModalOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Profile</Text>

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
                  <Text style={styles.inputLabel}>Year Level</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editForm.yearLevel}
                    onChangeText={(text) => setEditForm({...editForm, yearLevel: text})}
                    placeholder="e.g. 4th Year"
                    placeholderTextColor={palette.muted}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Student ID</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editForm.studentId}
                    onChangeText={(text) => setEditForm({...editForm, studentId: text})}
                    placeholder="e.g. 2022-XXXXX"
                    placeholderTextColor={palette.muted}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.textButton}
                    onPress={() => setIsEditModalOpen(false)}
                  >
                    <Text style={styles.textButtonLabel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.filledButton}
                    onPress={handleSaveProfile}
                  >
                    <Text style={styles.filledButtonLabel}>Save</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- COLLEGE SEARCHABLE PICKER MODAL (FLOATING DIALOG UX) --- */}
      <Modal visible={isCollegePickerOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.pickerOverlay}
          >
            <View style={styles.pickerContent}>

              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select College</Text>
                <TouchableOpacity onPress={() => setIsCollegePickerOpen(false)}>
                  <MaterialIcon name="close" size={24} color={palette.ink} />
                </TouchableOpacity>
              </View>

              {/* SEARCH FIELD WITH ICON */}
              <View style={styles.searchBar}>
                <MaterialIcon name="search" size={22} color={palette.muted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search colleges..."
                  placeholderTextColor={palette.muted}
                  value={collegeSearch}
                  onChangeText={setCollegeSearch}
                  autoCorrect={false}
                />
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: spacing.lg }}
              >
                {filteredColleges.length === 0 ? (
                  <Text style={styles.noResultsText}>No colleges found.</Text>
                ) : (
                  filteredColleges.map((college, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.collegeItem}
                      onPress={() => handleCollegeSelect(college)}
                    >
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  backButton: { padding: spacing.sm },
  headerTitle: { fontSize: 20, fontWeight: '600', color: palette.ink },
  headerRight: { width: 40 },

  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },

  heroSection: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xxl },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: palette.primary, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  avatarText: { fontSize: 36, fontWeight: '400', color: palette.surface },
  studentName: { fontSize: 26, fontWeight: '600', color: palette.ink, marginBottom: 4, letterSpacing: -0.5 },
  studentCourse: { fontSize: 15, fontWeight: '400', color: palette.body, marginBottom: spacing.md, textAlign: 'center' },

  heroPillContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(28,28,30,0.05)' },
  heroPillText: { fontSize: 13, fontWeight: '500', color: palette.body },
  heroPillDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: palette.muted },

  sectionLabel: { fontSize: 14, fontWeight: '600', color: palette.ink, marginBottom: spacing.md, marginLeft: 4, opacity: 0.8 },

  unifiedCard: { backgroundColor: palette.surface, borderRadius: 24, padding: spacing.lg, marginBottom: spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  statColumn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 24, fontWeight: '600', color: palette.ink, marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '500', color: palette.muted, textAlign: 'center' },
  verticalDivider: { width: 1, height: 40, backgroundColor: palette.border },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', width: '100%' },
  logoWrapper: { marginRight: spacing.md, marginTop: 4 },
  institutionLogo: { width: 48, height: 48 },
  infoTextGroup: { flex: 1 },
  infoTitle: { fontSize: 12, fontWeight: '500', color: palette.muted, marginBottom: 2 },
  infoSubtitle: { fontSize: 16, fontWeight: '500', color: palette.ink },
  horizontalDividerLite: { height: 1, backgroundColor: palette.border, marginVertical: spacing.md, width: '100%' },

  // --- SUBTLE INLINE DROPDOWN STYLING ---
  inlineDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    marginLeft: -12,
  },
  textMuted: { color: palette.muted },

  optionsContainer: { backgroundColor: palette.surface, borderRadius: 24, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginBottom: spacing.xxl },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.lg },
  optionLeft: { flexDirection: 'row', alignItems: 'center' },
  optionText: { fontSize: 16, fontWeight: '500', color: palette.ink, marginLeft: spacing.md },
  horizontalDivider: { height: 1, backgroundColor: palette.border, marginLeft: 40 },

  // --- EDIT PROFILE MODAL STYLES ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.lg },
  modalContent: { backgroundColor: palette.bg, borderRadius: 28, padding: spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, maxHeight: '85%' },
  modalTitle: { fontSize: 22, fontWeight: '600', color: palette.ink, marginBottom: spacing.lg },

  inputGroup: { marginBottom: spacing.md },
  inputLabel: { fontSize: 13, fontWeight: '500', color: palette.muted, marginBottom: 6, marginLeft: 4 },
  modalInput: { backgroundColor: palette.surface, borderRadius: 16, paddingHorizontal: 16, height: 52, fontSize: 16, color: palette.ink, fontWeight: '500' },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.md, marginBottom: spacing.sm, gap: spacing.md },
  textButton: { paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center' },
  textButtonLabel: { fontSize: 15, fontWeight: '600', color: palette.muted },
  filledButton: { backgroundColor: palette.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, justifyContent: 'center' },
  filledButtonLabel: { fontSize: 15, fontWeight: '600', color: palette.surface },

  // --- COLLEGE PICKER MODAL STYLES (FLOATING DIALOG) ---
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  pickerContent: { backgroundColor: palette.bg, borderRadius: 28, maxHeight: '80%', padding: spacing.xl },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  pickerTitle: { fontSize: 20, fontWeight: '600', color: palette.ink },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, borderRadius: 16, paddingHorizontal: 16, height: 52, marginBottom: spacing.lg },
  searchInput: { flex: 1, fontSize: 16, color: palette.ink, marginLeft: spacing.sm },

  collegeItem: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  collegeItemText: { fontSize: 15, color: palette.ink, fontWeight: '500', lineHeight: 22 },
  noResultsText: { textAlign: 'center', marginTop: spacing.xl, color: palette.muted, fontSize: 15 }
});