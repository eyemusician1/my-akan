import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  DeviceEventEmitter
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';

import { palette, spacing } from '../tokens';
import { database } from '../core/database';
import Schedule from '../core/database/models/Schedule';
import Subject from '../core/database/models/Subject';

// 1. REACTIVE READ-ONLY ROSTER BODY
const ScheduleRosterUI = ({ schedule, subjects, navigation }: { schedule: Schedule, subjects: Subject[], navigation: any }) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalUnits = subjects.reduce((sum, s) => sum + s.units, 0);

  const handleDeleteEntireSchedule = async () => {
    setIsDeleting(true);
    try {
      await database.write(async () => {
        const batchOps: any[] = [];
        for (const subj of subjects) {
          batchOps.push(subj.prepareDestroyPermanently());
        }
        batchOps.push(schedule.prepareDestroyPermanently());
        await database.batch(...batchOps);
      });

      setIsDeleteModalOpen(false);
      DeviceEventEmitter.emit('SHOW_TOAST', 'Schedule deleted');

      setTimeout(() => {
        navigation.goBack();
      }, 50);
    } catch (error) {
      console.error("Failed to batch delete schedule:", error);
      setIsDeleting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

      {/* HERO OVERVIEW PILL (Long press to delete entirely) */}
      <TouchableOpacity
        style={styles.heroCard}
        activeOpacity={0.85}
        onLongPress={() => setIsDeleteModalOpen(true)}
      >
        <View style={styles.heroMainRow}>
          <View style={styles.heroIconBox}>
            <MaterialIcon name="event-note" size={30} color={palette.secondary} />
          </View>

          <View style={styles.heroTextGroup}>
            <Text style={styles.heroTermTitle}>{schedule.academicTerm} Schedule</Text>
            <Text style={styles.heroTermStats}>
              {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}  •  {totalUnits} {totalUnits === 1 ? 'unit' : 'units'}
            </Text>
          </View>
        </View>

        <View style={styles.heroFooter}>
          <Text style={styles.deleteHint}>Long press card to delete entirely</Text>
        </View>
      </TouchableOpacity>

      {/* SECTION HEADER */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>Enrolled Subjects</Text>
        <Text style={styles.sectionBadge}>{subjects.length}</Text>
      </View>

      {/* STRICTLY READ-ONLY SUBJECT CARDS */}
      {subjects.map((subj) => (
        <View
          key={subj.id}
          style={styles.subjectCard}
        >
          <View style={styles.subjectLeft}>
            <Text style={styles.subjectCode}>{subj.code}</Text>
            <Text style={styles.subjectTitle} numberOfLines={1}>{subj.title || 'Untitled Subject'}</Text>
          </View>

          <View style={styles.subjectRight}>
            <View style={styles.unitPill}>
              <Text style={styles.unitPillText}>{subj.units} Units</Text>
            </View>
          </View>
        </View>
      ))}

      {/* CLEAN ICONLESS GOOGLE M3 DIALOG MODAL */}
      <Modal
        visible={isDeleteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setIsDeleteModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Delete schedule?</Text>
            <Text style={styles.dialogMessage}>
              This will permanently remove your <Text style={styles.boldSpan}>{schedule.academicTerm}</Text> schedule and all <Text style={styles.boldSpan}>{subjects.length}</Text> enrolled subjects.
            </Text>

            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
                <Text style={[styles.dialogBtnText, { color: palette.ink }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogBtn} onPress={handleDeleteEntireSchedule} disabled={isDeleting}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color={palette.primary} />
                ) : (
                  <Text style={[styles.dialogBtnText, { color: palette.primary }]}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

const ObservedScheduleRoster = withObservables(['schedule'], ({ schedule }: { schedule: Schedule }) => ({
  schedule: schedule.observe(),
  subjects: schedule.subjects.observeWithColumns(['code', 'title', 'units'])
}))(ScheduleRosterUI);


// 2. MAIN SCREEN VIEW
export function RecentSchedulesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [latestSchedule, setLatestSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const subscription = database.get<Schedule>('schedules')
      .query(Q.sortBy('created_at', Q.desc), Q.take(1))
      .observe()
      .subscribe(schedules => {
        if (schedules.length > 0) {
          setLatestSchedule(schedules[0]);
        } else {
          setLatestSchedule(null);
        }
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      {/* TOP APP BAR */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcon name="arrow-back" size={24} color={palette.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Details</Text>
        <View style={styles.headerRight} />
      </View>

      {isLoading ? (
        <View style={styles.centerAll}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : !latestSchedule ? (
        <View style={styles.centerAll}>
          <MaterialIcon name="event-busy" size={48} color={palette.muted} />
          <Text style={styles.emptyText}>No active schedule found.</Text>
        </View>
      ) : (
        <ObservedScheduleRoster schedule={latestSchedule} navigation={navigation} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  centerAll: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  backButton: { padding: spacing.xs, marginLeft: -4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: palette.ink },
  headerRight: { width: 40 },

  emptyText: { marginTop: spacing.md, fontSize: 16, color: palette.muted, fontWeight: '500' },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: 120, paddingTop: spacing.sm },

  // Hero Overview Pill
  heroCard: { backgroundColor: palette.surface, padding: 20, borderRadius: 28, marginBottom: spacing.xxl, borderWidth: 1, borderColor: 'rgba(28, 28, 30, 0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  heroMainRow: { flexDirection: 'row', alignItems: 'center' },
  heroIconBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(197, 160, 89, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: spacing.lg },
  heroTextGroup: { flex: 1, justifyContent: 'center' },
  heroTermTitle: { fontSize: 20, fontWeight: '700', color: palette.ink, marginBottom: 2, letterSpacing: -0.2 },
  heroTermStats: { fontSize: 14, color: palette.muted, fontWeight: '500' },
  heroFooter: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(28, 28, 30, 0.05)', alignItems: 'center' },
  deleteHint: { fontSize: 12, color: palette.muted, fontWeight: '600', letterSpacing: 0.2 },

  // Section Header
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, paddingHorizontal: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: palette.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionBadge: { fontSize: 13, fontWeight: '700', color: palette.muted },

  // Strictly Read-Only Subject Cards
  subjectCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.surface, padding: 16, borderRadius: 20, marginBottom: spacing.md, borderWidth: 1, borderColor: 'rgba(28, 28, 30, 0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  subjectLeft: { flex: 1, paddingRight: spacing.md },
  subjectCode: { fontSize: 18, fontWeight: '700', color: palette.ink, letterSpacing: -0.2, marginBottom: 2 },
  subjectTitle: { fontSize: 14, color: palette.body, fontWeight: '500' },
  subjectRight: { flexDirection: 'row', alignItems: 'center' },
  unitPill: { backgroundColor: 'rgba(122, 28, 28, 0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  unitPillText: { color: palette.primary, fontSize: 13, fontWeight: '700' },

  // Clean M3 Basic Dialog
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', padding: spacing.xl },
  dialogBox: { backgroundColor: palette.surface, borderRadius: 28, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  dialogTitle: { fontSize: 22, fontWeight: '600', color: palette.ink, marginBottom: 14 },
  dialogMessage: { fontSize: 15, color: palette.body, lineHeight: 22, marginBottom: 28 },
  boldSpan: { fontWeight: '700', color: palette.ink },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  dialogBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  dialogBtnText: { fontSize: 15, fontWeight: '600' }
});