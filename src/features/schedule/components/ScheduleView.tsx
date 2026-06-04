import React, { useState, Fragment } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import withObservables from '@nozbe/with-observables';
import { useNavigation } from '@react-navigation/native';

import { palette, spacing } from '../../../tokens';
import { database } from '../../../core/database';
import Subject from '../../../core/database/models/Subject';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const HOUR_HEIGHT = 60;
const START_HOUR = 7;
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getDayLabel = (days: string[]) => {
  const map: Record<string, string> = { Mon: 'M', Tue: 'T', Wed: 'W', Thu: 'TH', Fri: 'F', Sat: 'S' };
  return days.map(d => map[d] || d).join('');
};

const timeToDecimal = (timeStr: string) => {
  if (!timeStr) return 0;
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours + (minutes / 60);
};

const formatHour = (hour: number) => {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formatted = hour > 12 ? hour - 12 : hour;
  return `${formatted} ${ampm}`;
};

const ExpandableEventCard = ({ item, onDelete }: { item: any, onDelete: () => void }) => {
  const navigation = useNavigation<any>();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const handleEdit = () => {
    navigation.navigate('ManualEntry', { editSubjectId: item.id });
  };

  return (
    <View style={styles.eventRow}>
      <View style={styles.timeColumn}>
        <Text style={styles.timeText}>{item.time.split(' ')[0]}</Text>
        <Text style={styles.amPmText}>{item.time.split(' ')[1]}</Text>
      </View>

      <TouchableOpacity
        style={[styles.eventCard, { backgroundColor: item.bgTint }]}
        activeOpacity={0.7}
        onPress={toggleExpand}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.eventTitle, { color: item.themeColor }]} numberOfLines={1}>
            {item.code} {item.section ? `(${item.section})` : ''}
          </Text>
          <MaterialIcon
            name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={20}
            color={item.themeColor}
            style={styles.chevronIcon}
          />
        </View>

        <Text style={styles.eventSubtitle} numberOfLines={isExpanded ? undefined : 1}>
          {item.title}
        </Text>

        <Text style={styles.eventTimeRange}>
          <Text style={styles.dayLabelHighlight}>{item.dayLabel}</Text> • {item.time} - {item.endTimeStr}
        </Text>

        {isExpanded && (
          <View style={styles.footerRow}>
            <View style={styles.footerInfo}>
              <View style={styles.footerItem}>
                <MaterialIcon name="room" size={16} color={item.themeColor} style={styles.iconOp} />
                <Text style={[styles.footerText, { color: item.themeColor }]}>{item.room || 'TBA'}</Text>
              </View>
              <View style={styles.footerItem}>
                <MaterialIcon name="person" size={16} color={item.themeColor} style={styles.iconOp} />
                <Text style={[styles.footerText, { color: item.themeColor }]}>{item.instructor || 'TBA'}</Text>
              </View>
            </View>

            <View style={styles.footerActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleEdit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialIcon name="edit" size={18} color={palette.muted} />
              </TouchableOpacity>
              {/* TRIGGER CUSTOM MODAL ON DELETE */}
              <TouchableOpacity style={styles.actionBtn} onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialIcon name="delete-outline" size={18} color={palette.muted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const ScheduleViewUI = ({ subjects }: { subjects: Subject[] }) => {
  const [viewMode, setViewMode] = useState<'agenda' | 'week'>('agenda');
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNamesFull = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();

  const currentDayName = dayNamesFull[today.getDay()];
  const currentDateString = `${currentDayName}, ${monthNames[today.getMonth()]} ${today.getDate()}`;

  const activeDay = DAYS.includes(currentDayName) ? currentDayName : 'Mon';

  const themeColors = [palette.primary, palette.body, palette.ink];
  const bgTints = ['rgba(122, 28, 28, 0.08)', 'rgba(197, 160, 89, 0.15)', 'rgba(28, 28, 30, 0.06)'];

  const liveSchedule = subjects.map((subj, index) => {
    const cIdx = index % themeColors.length;
    return {
      id: subj.id,
      rawModel: subj,
      dayLabel: getDayLabel(subj.days),
      days: subj.days,
      startTime: timeToDecimal(subj.startTime),
      endTime: timeToDecimal(subj.endTime),
      time: subj.startTime,
      endTimeStr: subj.endTime,
      code: subj.code,
      section: subj.section,
      title: subj.title,
      room: subj.room,
      instructor: subj.instructor,
      themeColor: themeColors[cIdx],
      bgTint: bgTints[cIdx]
    };
  });

  const agendaItems = liveSchedule
    .filter(item => item.days.includes(activeDay))
    .sort((a, b) => a.startTime - b.startTime);

  // --- SMART CASCADING DELETE LOGIC ---
  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await database.write(async () => {
        const subjectModel = itemToDelete.rawModel;
        const parentSchedule = await subjectModel.schedule.fetch();

        // Count siblings BEFORE deletion
        const siblings = await parentSchedule.subjects.fetch();

        await subjectModel.destroyPermanently();

        // If this was the only subject, destroy the parent schedule as well
        if (siblings.length <= 1) {
          await parentSchedule.destroyPermanently();
        }
      });
    } catch (error) {
      console.error("Delete failed", error);
    } finally {
      setItemToDelete(null);
    }
  };

  const renderAgenda = () => {
    if (agendaItems.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcon name="celebration" size={32} color={palette.muted} />
          <Text style={styles.emptyStateText}>No classes today. Enjoy your free time!</Text>
        </View>
      );
    }

    let renderedMorning = false;
    let renderedAfternoon = false;

    const firstClassStart = agendaItems[0].startTime;
    const lastClassEnd = agendaItems[agendaItems.length - 1].endTime;

    return (
      <View style={styles.eventsContainer}>
        {firstClassStart >= 12 && (
          <View style={styles.freeTimeWrapper}>
            <View style={styles.freeTimePill}>
              <MaterialIcon name="wb-sunny" size={14} color={palette.muted} />
              <Text style={styles.freeTimeText}>Free morning</Text>
            </View>
          </View>
        )}

        {agendaItems.map((item, index) => {
          let freeTimeIndicator = null;
          let sectionHeader = null;

          if (item.startTime < 12 && !renderedMorning) {
            renderedMorning = true;
            sectionHeader = (
              <View style={styles.timeSectionHeader}>
                <MaterialIcon name="light-mode" size={14} color={palette.muted} />
                <Text style={styles.timeSectionText}>MORNING</Text>
              </View>
            );
          } else if (item.startTime >= 12 && !renderedAfternoon) {
            renderedAfternoon = true;
            sectionHeader = (
              <View style={styles.timeSectionHeader}>
                <MaterialIcon name="dark-mode" size={14} color={palette.muted} />
                <Text style={styles.timeSectionText}>AFTERNOON</Text>
              </View>
            );
          }

          if (index > 0) {
            const prevItem = agendaItems[index - 1];
            const gap = item.startTime - prevItem.endTime;

            if (gap >= 1) {
              const hrs = Math.floor(gap);
              const mins = Math.round((gap - hrs) * 60);
              let gapText = '';
              if (hrs > 0) gapText += `${hrs} hr `;
              if (mins > 0) gapText += `${mins} min `;
              gapText += 'free time';

              freeTimeIndicator = (
                <View style={styles.freeTimeWrapper}>
                  <View style={styles.freeTimePill}>
                    <MaterialIcon name="local-cafe" size={14} color={palette.muted} />
                    <Text style={styles.freeTimeText}>{gapText.trim()}</Text>
                  </View>
                </View>
              );
            }
          }

          return (
            <Fragment key={item.id}>
              {sectionHeader}
              {freeTimeIndicator}
              <ExpandableEventCard
                item={item}
                onDelete={() => setItemToDelete(item)}
              />
            </Fragment>
          );
        })}

        {lastClassEnd <= 12.5 && (
          <View style={styles.freeTimeWrapper}>
            <View style={styles.freeTimePill}>
              <MaterialIcon name="park" size={14} color={palette.muted} />
              <Text style={styles.freeTimeText}>Free whole afternoon</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderWeek = () => (
    <View style={styles.weekGridWrapper}>
      <View style={styles.timeAxis}>
        <View style={styles.dayHeaderSpacer} />
        {HOURS.map((hour) => (
          <Text key={hour} style={styles.gridTimeLabel}>{formatHour(hour)}</Text>
        ))}
      </View>

      <View style={styles.weekGrid}>
        {DAYS.map((day) => (
          <View key={day} style={styles.dayColumn}>

            <View style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>{day}</Text>
            </View>

            <View style={styles.dayGridArea}>
              {HOURS.map((hour) => (
                <View key={hour} style={styles.gridLine} />
              ))}

              {liveSchedule
                .filter(item => item.days.includes(day))
                .map(item => {
                  const topPosition = (item.startTime - START_HOUR) * HOUR_HEIGHT;
                  const cardHeight = (item.endTime - item.startTime) * HOUR_HEIGHT;

                  return (
                    <TouchableOpacity
                      key={`${item.id}-${day}`}
                      activeOpacity={0.8}
                      style={[
                        styles.gridEventCard,
                        {
                          backgroundColor: item.bgTint,
                          top: topPosition,
                          height: cardHeight,
                        }
                      ]}
                    >
                      <Text style={[styles.gridEventTitle, { color: item.themeColor }]} numberOfLines={2}>
                        {item.code}
                      </Text>
                      <Text style={[styles.gridEventTime, { color: item.themeColor }]} numberOfLines={1}>
                        {item.room}
                      </Text>
                    </TouchableOpacity>
                  );
              })}
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.dateText}>Today, {currentDateString}</Text>

        <View style={styles.toggleWrapper}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'agenda' && styles.toggleButtonActive]}
            onPress={() => setViewMode('agenda')}
          >
            <MaterialIcon name="view-agenda" size={18} color={viewMode === 'agenda' ? palette.ink : palette.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'week' && styles.toggleButtonActive]}
            onPress={() => setViewMode('week')}
          >
            <MaterialIcon name="calendar-view-week" size={18} color={viewMode === 'week' ? palette.ink : palette.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'agenda' ? renderAgenda() : renderWeek()}

      {/* --- CUSTOM DELETE CONFIRMATION MODAL --- */}
      <Modal visible={!!itemToDelete} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <MaterialIcon name="delete-outline" size={32} color={palette.primary} />
            </View>
            <Text style={styles.modalTitle}>Remove Class</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to remove <Text style={styles.modalHighlight}>{itemToDelete?.code}</Text> from your schedule? This action cannot be undone.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setItemToDelete(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDeleteBtn} onPress={confirmDelete}>
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

export const ScheduleView = withObservables([], () => ({
  subjects: database.collections.get<Subject>('subjects').query().observe(),
}))(ScheduleViewUI);

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingHorizontal: spacing.xs },

  dateText: { fontSize: 18, fontWeight: '700', color: palette.ink },

  toggleWrapper: { flexDirection: 'row', backgroundColor: 'rgba(28, 28, 30, 0.05)', borderRadius: 20, padding: 4 },
  toggleButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  toggleButtonActive: { backgroundColor: palette.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },

  eventsContainer: { gap: 16 },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timeColumn: { width: 68, paddingTop: 12, paddingRight: spacing.md },
  timeText: { fontSize: 15, fontWeight: '600', color: palette.ink, textAlign: 'right' },
  amPmText: { fontSize: 13, fontWeight: '500', color: palette.muted, textAlign: 'right', marginTop: 2 },
  eventCard: { flex: 1, borderRadius: 24, padding: 18 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  eventTitle: { flex: 1, fontSize: 18, fontWeight: '700', letterSpacing: -0.2, marginRight: spacing.sm },
  chevronIcon: { opacity: 0.5, marginTop: 2 },
  eventSubtitle: { fontSize: 15, color: palette.ink, fontWeight: '600', marginBottom: 6, opacity: 0.85 },
  dayLabelHighlight: { fontWeight: '700' },
  eventTimeRange: { fontSize: 14, color: palette.ink, opacity: 0.7, fontWeight: '500' },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  footerInfo: { flexDirection: 'row', gap: spacing.lg },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionBtn: { padding: 4, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 8 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconOp: { opacity: 0.8 },
  footerText: { fontSize: 13, fontWeight: '600', opacity: 0.85 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyStateText: { marginTop: 12, fontSize: 15, color: palette.muted, fontWeight: '500' },

  timeSectionHeader: { flexDirection: 'row', alignItems: 'center', paddingLeft: 68 + spacing.sm, marginTop: spacing.xs, marginBottom: spacing.xs },
  timeSectionText: { fontSize: 11, fontWeight: '700', color: palette.muted, marginLeft: 6, letterSpacing: 0.8 },

  freeTimeWrapper: { paddingLeft: 68 + spacing.sm, paddingVertical: 2, alignItems: 'flex-start' },
  freeTimePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(28, 28, 30, 0.04)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  freeTimeText: { fontSize: 12, fontWeight: '600', color: palette.muted, marginLeft: 6 },

  /* --- CUSTOM MODAL STYLES --- */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  modalContent: { width: '100%', backgroundColor: palette.surface, borderRadius: 28, padding: spacing.xl, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(122, 28, 28, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: 22, fontWeight: '700', color: palette.ink, marginBottom: spacing.xs },
  modalMessage: { fontSize: 15, color: palette.body, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl, paddingHorizontal: spacing.sm },
  modalHighlight: { fontWeight: '700', color: palette.ink },
  modalActions: { flexDirection: 'row', width: '100%', gap: spacing.md },
  modalCancelBtn: { flex: 1, height: 52, borderRadius: 26, backgroundColor: 'rgba(28, 28, 30, 0.05)', justifyContent: 'center', alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: palette.ink },
  modalDeleteBtn: { flex: 1, height: 52, borderRadius: 26, backgroundColor: palette.primary, justifyContent: 'center', alignItems: 'center' },
  modalDeleteText: { fontSize: 16, fontWeight: '600', color: palette.surface },

  weekGridWrapper: { flexDirection: 'row', borderTopWidth: 1, borderColor: palette.border, paddingTop: spacing.sm },
  timeAxis: { width: 44 },
  dayHeaderSpacer: { height: 36 },
  gridTimeLabel: { height: HOUR_HEIGHT, fontSize: 11, fontWeight: '500', color: palette.muted, textAlign: 'right', paddingRight: 6, top: -8 },
  weekGrid: { flex: 1, flexDirection: 'row' },
  dayColumn: { flex: 1, borderRightWidth: 1, borderColor: palette.border },
  dayHeader: { height: 36, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderColor: palette.border },
  dayHeaderText: { fontSize: 12, fontWeight: '600', color: palette.ink },
  dayGridArea: { position: 'relative', height: HOURS.length * HOUR_HEIGHT },
  gridLine: { height: HOUR_HEIGHT, borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  gridEventCard: { position: 'absolute', left: 1, right: 1, borderRadius: 6, padding: 3, borderLeftWidth: 2, borderLeftColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' },
  gridEventTitle: { fontSize: 10, lineHeight: 12, fontWeight: '700', marginBottom: 2 },
  gridEventTime: { fontSize: 9, lineHeight: 11, fontWeight: '600', opacity: 0.8 },
});