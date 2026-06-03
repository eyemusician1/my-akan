import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { palette } from '../../../shared/tokens/colors';
import { spacing } from '../../../shared/tokens/spacing';

const mockSchedule = [
  {
    id: '1', time: '08:30 AM', endTime: '10:00 AM', code: 'ITD110',
    title: 'NoSQL Databases', room: 'Maclab', instructor: 'Dr. Ampog',
    themeColor: palette.terracotta,
    bgTint: 'rgba(122, 28, 28, 0.08)'
  },
  {
    id: '2', time: '10:30 AM', endTime: '01:00 PM', code: 'ITE192',
    title: 'Information Engineering', room: 'Room 305', instructor: 'Prof. Gomez',
    themeColor: palette.body,
    bgTint: 'rgba(197, 160, 89, 0.15)'
  },
  {
    id: '3', time: '02:30 PM', endTime: '05:00 PM', code: 'STT071.1',
    title: 'Probability & Stat Inference', room: 'Room 202', instructor: 'Prof. Bayon-on',
    themeColor: palette.ink,
    bgTint: 'rgba(28, 28, 30, 0.06)'
  },
];

export function ScheduleView() {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.dateText}>Today, Feb 12</Text>
        <MaterialIcon name="calendar-today" size={20} color={palette.ink} />
      </View>

      <View style={styles.eventsContainer}>
        {mockSchedule.map((item) => (
          <View key={item.id} style={styles.eventRow}>

            <View style={styles.timeColumn}>
              <Text style={styles.timeText}>{item.time.split(' ')[0]}</Text>
              <Text style={styles.amPmText}>{item.time.split(' ')[1]}</Text>
            </View>

            <TouchableOpacity
              style={[styles.eventCard, { backgroundColor: item.bgTint }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.eventTitle, { color: item.themeColor }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.eventTimeRange}>
                {item.time} - {item.endTime} • {item.code}
              </Text>

              <View style={styles.footerRow}>
                <View style={styles.footerItem}>
                  <MaterialIcon name="room" size={14} color={item.themeColor} style={styles.iconOp} />
                  <Text style={[styles.footerText, { color: item.themeColor }]}>{item.room}</Text>
                </View>
                <View style={styles.footerItem}>
                  <MaterialIcon name="person" size={14} color={item.themeColor} style={styles.iconOp} />
                  <Text style={[styles.footerText, { color: item.themeColor }]}>{item.instructor}</Text>
                </View>
              </View>
            </TouchableOpacity>

          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.ink,
  },
  eventsContainer: {
    gap: spacing.md,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timeColumn: {
    width: 60,
    paddingTop: 8,
    paddingRight: spacing.sm,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.ink,
    textAlign: 'right',
  },
  amPmText: {
    fontSize: 12,
    fontWeight: '500',
    color: palette.muted,
    textAlign: 'right',
    marginTop: 2,
  },
  eventCard: {
    flex: 1,
    borderRadius: 12,
    padding: spacing.md,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  eventTimeRange: {
    fontSize: 13,
    color: palette.ink,
    opacity: 0.7,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconOp: {
    opacity: 0.8,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.85,
  },
});