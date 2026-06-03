import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, spacing } from '../tokens/colors';
import { ScheduleView } from '../features/schedule/components/ScheduleView';

// --- MOCK DATA ---
const mockSchedule = [
  { id: '1', time: '08:30 AM', endTime: '10:00 AM', code: 'ITD110', title: 'NoSQL Databases', room: 'Maclab', instructor: 'Dr. Ampog', color: palette.primary },
  { id: '2', time: '10:30 AM', endTime: '01:00 PM', code: 'ITE192', title: 'Information Engineering', room: 'Room 305', instructor: 'Prof. Gomez', color: palette.secondary },
  { id: '3', time: '02:30 PM', endTime: '05:00 PM', code: 'STT071.1', title: 'Probability & Stat Inference', room: 'Room 202', instructor: 'Prof. Bayon-on', color: palette.ink },
];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('Schedules'); // Defaulted to Schedules for testing
  const [isFabOpen, setIsFabOpen] = useState(false);
  const filters = ['Recent', 'Schedules', 'Payments', 'Archived'];

  const renderRecent = () => (
    <TouchableOpacity style={styles.card} activeOpacity={0.8}>
      <View style={styles.cardLeft}>
        <View style={styles.cardIconBox}>
          <MaterialIcon name="event-note" size={24} color={palette.secondary} />
        </View>
        <View style={styles.cardTextGroup}>
          <Text style={styles.cardTitle}>1st Semester Schedule</Text>
          <Text style={styles.cardSubtitle}>8 subjects • Updated 2 hrs ago</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.cardAction}>
        <MaterialIcon name="auto-awesome" size={20} color={palette.ink} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSchedules = () => (
    <View style={styles.agendaContainer}>
      {/* Mini Calendar/Day Header */}
      <View style={styles.daySelector}>
        <Text style={styles.dayHeader}>Today, Feb 12</Text>
        <MaterialIcon name="calendar-today" size={20} color={palette.ink} />
      </View>

      {/* Timeline List */}
      {mockSchedule.map((item, index) => (
        <View key={item.id} style={styles.timelineRow}>

          {/* Left Time Column */}
          <View style={styles.timeColumn}>
            <Text style={styles.timeText}>{item.time.split(' ')[0]}</Text>
            <Text style={styles.amPmText}>{item.time.split(' ')[1]}</Text>
          </View>

          {/* Center Line & Dot */}
          <View style={styles.lineColumn}>
            <View style={[styles.timelineDot, { borderColor: item.color }]} />
            {index !== mockSchedule.length - 1 && <View style={styles.timelineLine} />}
          </View>

          {/* Right Event Card */}
          <TouchableOpacity style={[styles.eventCard, { borderLeftColor: item.color }]} activeOpacity={0.8}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventCode}>{item.code}</Text>
              <Text style={styles.eventDuration}>{item.time} - {item.endTime}</Text>
            </View>
            <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>

            <View style={styles.eventFooter}>
              <View style={styles.eventFooterItem}>
                <MaterialIcon name="room" size={14} color={palette.body} />
                <Text style={styles.eventFooterText}>{item.room}</Text>
              </View>
              <View style={styles.eventFooterItem}>
                <MaterialIcon name="person" size={14} color={palette.body} />
                <Text style={styles.eventFooterText}>{item.instructor}</Text>
              </View>
            </View>
          </TouchableOpacity>

        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/images/msuLogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Trak'n</Text>
        </View>

        <View style={styles.avatar}>
          <MaterialIcon name="person" size={20} color={palette.surface} />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.contentArea} contentContainerStyle={styles.contentPadding}>
        {activeFilter === 'Recent' && renderRecent()}

        {/* Render the extracted component */}
        {activeFilter === 'Schedules' && <ScheduleView />}

        {/* You can create and import <PaymentsView /> here later */}
      </ScrollView>

      {/* Full Screen Dimmer for the Menu */}
      {isFabOpen && (
        <TouchableOpacity
          style={styles.dimOverlay}
          activeOpacity={1}
          onPress={() => setIsFabOpen(false)}
        />
      )}

      {/* Unified Bottom Area for Buttons and Menu */}
      <View style={[styles.bottomWrapper, { paddingBottom: insets.bottom + spacing.xl }]}>
        {isFabOpen && (
          <View style={styles.fabMenuContainer}>
            <View style={styles.fabMenu}>
              <TouchableOpacity style={styles.fabMenuItem}>
                <MaterialIcon name="crop-free" size={22} color={palette.ink} />
                <Text style={styles.fabMenuText}>Scan COR (Camera)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fabMenuItem}>
                <MaterialIcon name="image" size={22} color={palette.ink} />
                <Text style={styles.fabMenuText}>Upload Image</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fabMenuItem}>
                <MaterialIcon name="edit" size={22} color={palette.ink} />
                <Text style={styles.fabMenuText}>Manual Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.fabRow}>
          <TouchableOpacity style={styles.fabCamera} activeOpacity={0.9}>
            <MaterialIcon name="photo-camera" size={24} color={palette.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabCreate, isFabOpen && styles.fabCreateActive]}
            activeOpacity={0.9}
            onPress={() => setIsFabOpen(!isFabOpen)}
          >
            <MaterialIcon
              name={isFabOpen ? "close" : "add"}
              size={22}
              color={isFabOpen ? palette.ink : palette.surface}
              style={styles.fabCreateIcon}
            />
            <Text style={[styles.fabCreateText, isFabOpen && styles.fabCreateTextActive]}>
              {isFabOpen ? "Cancel" : "Create New"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 28, height: 28, marginRight: spacing.sm },
  headerTitle: { fontSize: 22, fontWeight: '700', color: palette.ink, letterSpacing: -0.5 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.primary, justifyContent: 'center', alignItems: 'center' },

  filterContainer: { height: 50 },
  filterScroll: { paddingHorizontal: spacing.xl, alignItems: 'center', gap: spacing.sm },
  filterChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.bg },
  filterChipActive: { backgroundColor: palette.ink, borderColor: palette.ink },
  filterText: { fontSize: 14, fontWeight: '500', color: palette.body },
  filterTextActive: { color: palette.surface },

  contentArea: { flex: 1 },
  contentPadding: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 120 },

  /* Recent Card Styles */
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: palette.surface, padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: palette.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(197, 160, 89, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  cardTextGroup: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: palette.ink, marginBottom: 2 },
  cardSubtitle: { fontSize: 13, color: palette.muted },
  cardAction: { padding: spacing.sm },

  /* --- NEW: Schedule Agenda Styles --- */
  agendaContainer: { marginTop: spacing.sm },
  daySelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingHorizontal: spacing.xs },
  dayHeader: { fontSize: 18, fontWeight: '700', color: palette.ink },

  timelineRow: { flexDirection: 'row', marginBottom: spacing.md },
  timeColumn: { width: 65, alignItems: 'flex-end', paddingRight: spacing.md, paddingTop: 4 },
  timeText: { fontSize: 14, fontWeight: '700', color: palette.ink },
  amPmText: { fontSize: 11, fontWeight: '500', color: palette.muted, marginTop: 2 },

  lineColumn: { width: 20, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, backgroundColor: palette.bg, zIndex: 2, marginTop: 6 },
  timelineLine: { width: 2, backgroundColor: palette.border, position: 'absolute', top: 18, bottom: -spacing.md, zIndex: 1 },

  eventCard: { flex: 1, backgroundColor: palette.surface, borderRadius: 12, padding: spacing.md, marginLeft: spacing.sm, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  eventCode: { fontSize: 13, fontWeight: '700', color: palette.ink },
  eventDuration: { fontSize: 12, color: palette.muted, fontWeight: '500' },
  eventTitle: { fontSize: 15, fontWeight: '600', color: palette.ink, marginBottom: spacing.sm },

  eventFooter: { flexDirection: 'row', gap: spacing.md },
  eventFooterItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventFooterText: { fontSize: 12, color: palette.body, fontWeight: '500' },

  /* Overlays and FAB */
  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(251, 251, 253, 0.9)', zIndex: 10 },
  bottomWrapper: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', zIndex: 20 },
  fabMenuContainer: { width: '100%', alignItems: 'center', paddingLeft: 64, marginBottom: spacing.md },
  fabMenu: { backgroundColor: palette.surface, width: 220, borderRadius: 20, paddingVertical: spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8, borderWidth: 1, borderColor: palette.border },
  fabMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  fabMenuText: { fontSize: 16, fontWeight: '600', color: palette.ink, marginLeft: spacing.md },
  fabRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  fabCamera: { width: 56, height: 56, borderRadius: 28, backgroundColor: palette.surface, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, borderWidth: 1, borderColor: palette.border },
  fabCreate: { height: 56, borderRadius: 28, backgroundColor: palette.ink, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
  fabCreateActive: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, shadowOpacity: 0, elevation: 0 },
  fabCreateIcon: { marginRight: spacing.xs },
  fabCreateText: { color: palette.surface, fontSize: 16, fontWeight: '700' },
  fabCreateTextActive: { color: palette.ink },
});