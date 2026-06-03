import React, { useState, Fragment } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { palette } from '../../../shared/tokens/colors';
import { spacing } from '../../../shared/tokens/spacing';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// --- ACTUAL COR SCHEDULE DATA ---
const mockSchedule = [
  {
    id: '1', dayLabel: 'MW', days: ['Mon', 'Wed'],
    startTime: 12, endTime: 14.5, time: '12:00 PM', endTimeStr: '02:30 PM', code: 'ITD110',
    title: 'NoSQL Databases', room: 'Room 305', instructor: 'Dr. Ampog',
    themeColor: palette.terracotta, bgTint: 'rgba(122, 28, 28, 0.08)'
  },
  {
    id: '2', dayLabel: 'MW', days: ['Mon', 'Wed'],
    startTime: 14.5, endTime: 16, time: '02:30 PM', endTimeStr: '04:00 PM', code: 'ITE182',
    title: 'Systems Integration & Admin', room: 'Maclab', instructor: 'TBA',
    themeColor: palette.body, bgTint: 'rgba(197, 160, 89, 0.15)'
  },
  {
    id: '3', dayLabel: 'TH', days: ['Tue', 'Thu'],
    startTime: 8.5, endTime: 10, time: '08:30 AM', endTimeStr: '10:00 AM', code: 'STT071.1',
    title: 'Prob & Stat Inference (Lab)', room: 'Room 306', instructor: 'Prof. Bayon-on',
    themeColor: palette.ink, bgTint: 'rgba(28, 28, 30, 0.06)'
  },
  {
    id: '4', dayLabel: 'TH', days: ['Tue', 'Thu'],
    startTime: 10.5, endTime: 13, time: '10:30 AM', endTimeStr: '01:00 PM', code: 'ITE192',
    title: 'Information Engineering', room: 'TBA', instructor: 'Prof. Gomez',
    themeColor: palette.terracotta, bgTint: 'rgba(122, 28, 28, 0.08)'
  },
  {
    id: '5', dayLabel: 'FS', days: ['Fri', 'Sat'],
    startTime: 14.5, endTime: 17, time: '02:30 PM', endTimeStr: '05:00 PM', code: 'ITD104',
    title: 'Database Security & Admin', room: 'Room 202', instructor: 'TBA',
    themeColor: palette.body, bgTint: 'rgba(197, 160, 89, 0.15)'
  },
  {
    id: '6', dayLabel: 'F', days: ['Fri'],
    startTime: 8.5, endTime: 11.5, time: '08:30 AM', endTimeStr: '11:30 AM', code: 'ITE193',
    title: 'Special Topics in IT', room: 'Room 202', instructor: 'TBA',
    themeColor: palette.ink, bgTint: 'rgba(28, 28, 30, 0.06)'
  },
  {
    id: '7', dayLabel: 'MW', days: ['Mon', 'Wed'],
    startTime: 8.5, endTime: 10, time: '08:30 AM', endTimeStr: '10:00 AM', code: 'STT071',
    title: 'Prob & Stat Inference', room: 'Room FL', instructor: 'TBA',
    themeColor: palette.terracotta, bgTint: 'rgba(122, 28, 28, 0.08)'
  },
];

const HOUR_HEIGHT = 60;
const START_HOUR = 7;
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatHour = (hour: number) => {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formatted = hour > 12 ? hour - 12 : hour;
  return `${formatted} ${ampm}`;
};

const ExpandableEventCard = ({ item }: { item: typeof mockSchedule[0] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
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
            {item.code}
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
            <View style={styles.footerItem}>
              <MaterialIcon name="room" size={16} color={item.themeColor} style={styles.iconOp} />
              <Text style={[styles.footerText, { color: item.themeColor }]}>{item.room}</Text>
            </View>
            <View style={styles.footerItem}>
              <MaterialIcon name="person" size={16} color={item.themeColor} style={styles.iconOp} />
              <Text style={[styles.footerText, { color: item.themeColor }]}>{item.instructor}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

export function ScheduleView() {
  const [viewMode, setViewMode] = useState<'agenda' | 'week'>('agenda');

  // Dynamic Date Setup
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNamesFull = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();

  const currentDayName = dayNamesFull[today.getDay()];
  const currentDateString = `${currentDayName}, ${monthNames[today.getMonth()]} ${today.getDate()}`;

  // SMART SORTING & FILTERING
  // If today is Sunday (no classes), fallback to Monday to ensure the UI isn't empty.
  const activeDay = DAYS.includes(currentDayName) ? currentDayName : 'Mon';

  // Filter for today's classes and sort them by start time
  const agendaItems = mockSchedule
    .filter(item => item.days.includes(activeDay))
    .sort((a, b) => a.startTime - b.startTime);

  const renderAgenda = () => (
    <View style={styles.eventsContainer}>
      {agendaItems.map((item, index) => {
        let freeTimeIndicator = null;

        // Calculate gap if it's not the first class
        if (index > 0) {
          const prevItem = agendaItems[index - 1];
          const gap = item.startTime - prevItem.endTime;

          // Only show indicator if the gap is 1 hour or more
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
            {freeTimeIndicator}
            <ExpandableEventCard item={item} />
          </Fragment>
        );
      })}
    </View>
  );

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

              {mockSchedule
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingHorizontal: spacing.xs },

  // Notice the slightly smaller date text to comfortably fit the Day of Week string
  dateText: { fontSize: 18, fontWeight: '700', color: palette.ink },

  toggleWrapper: { flexDirection: 'row', backgroundColor: 'rgba(28, 28, 30, 0.05)', borderRadius: 20, padding: 4 },
  toggleButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  toggleButtonActive: { backgroundColor: palette.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },

  /* --- AGENDA STYLES --- */
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
  footerRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconOp: { opacity: 0.8 },
  footerText: { fontSize: 13, fontWeight: '600', opacity: 0.85 },

  /* --- FREE TIME INDICATOR STYLES --- */
  freeTimeWrapper: {
    paddingLeft: 68 + spacing.sm, // Aligns exactly with the start of the event cards
    paddingVertical: 2,
    alignItems: 'flex-start',
  },
  freeTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 28, 30, 0.04)', // Very subtle grey
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  freeTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.muted,
    marginLeft: 6,
  },

  /* --- WEEK GRID STYLES --- */
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