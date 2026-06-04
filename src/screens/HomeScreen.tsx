import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  Animated
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';

import { palette, spacing } from '../tokens';
import { ScheduleView } from '../features/schedule/components/ScheduleView';
import { database } from '../core/database';
import Schedule from '../core/database/models/Schedule';

// --- TIME FORMATTING HELPER ---
const getTimeAgo = (date: Date) => {
  if (!date) return 'Just now';
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
};

// --- REACTIVE CARD COMPONENT ---
const ScheduleCardItemUI = ({ schedule, subjectCount }: { schedule: Schedule, subjectCount: number }) => {
  // REDESIGNED: Borderless empty state when subjects are removed completely
  if (subjectCount === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcon name="folder-open" size={32} color={palette.muted} />
        <Text style={styles.emptyStateTitle}>Schedule is empty</Text>
        <Text style={styles.emptyStateSub}>Add subjects via manual entry or scanner.</Text>
      </View>
    );
  }

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardIconBox}>
        <MaterialIcon name="event-note" size={28} color={palette.secondary} />
      </View>
      <View style={styles.cardTextGroup}>
        <Text style={styles.cardTitle}>{schedule.academicTerm} Schedule</Text>
        <Text style={styles.cardSubtitle}>
          {subjectCount} subject{subjectCount !== 1 ? 's' : ''} • Updated {getTimeAgo(schedule.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
};

const EnhancedScheduleCardItem = withObservables(['schedule'], ({ schedule }: { schedule: Schedule }) => ({
  schedule: schedule.observe(),
  subjectCount: schedule.subjects.observeCount(),
}))(ScheduleCardItemUI);

const RecentScheduleListUI = ({ schedules }: { schedules: Schedule[] }) => {
  const latestSchedule = schedules[0];

  // REDESIGNED: Clean, subtle, and borderless initial empty state matching the schedules view
  if (!latestSchedule) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcon name="calendar-today" size={32} color={palette.muted} />
        <Text style={styles.emptyStateTitle}>No schedules yet</Text>
        <Text style={styles.emptyStateSub}>Tap '+' to create your first schedule.</Text>
      </View>
    );
  }

  return <EnhancedScheduleCardItem schedule={latestSchedule} />;
};

const RecentScheduleWrapper = withObservables([], () => ({
  schedules: database.collections.get<Schedule>('schedules').query(Q.sortBy('created_at', Q.desc)).observe(),
}))(RecentScheduleListUI);


export function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('Recent');
  const [isFabOpen, setIsFabOpen] = useState(false);
  const filters = ['Recent', 'Schedules', 'Payments', 'Archived'];

  const scrollY = useRef(new Animated.Value(0)).current;
  const clampedScrollY = Animated.diffClamp(scrollY, 0, 100);

  const fabTranslateY = clampedScrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 130],
    extrapolate: 'clamp',
  });

  const fabOpacity = clampedScrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    const cleanupEmptySchedules = async () => {
      try {
        const schedules = await database.collections.get<Schedule>('schedules').query().fetch();
        const emptySchedules: Schedule[] = [];

        for (const sch of schedules) {
          const count = await sch.subjects.fetchCount();
          if (count === 0) emptySchedules.push(sch);
        }

        if (emptySchedules.length > 0) {
          await database.write(async () => {
            for (const sch of emptySchedules) {
              await sch.destroyPermanently();
            }
          });
        }
      } catch (error) {
        console.error("Cleanup failed", error);
      }
    };

    cleanupEmptySchedules();
  }, [activeFilter]);

  return (
    <View style={styles.container}>

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/images/msuLogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Trakn</Text>
        </View>
        <View style={styles.avatar}>
          <MaterialIcon name="person" size={20} color={palette.surface} />
        </View>
      </View>

      <View style={styles.filterContainer}>
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filters.map((filter) => (
            <Pressable
              key={filter}
              style={({ pressed }) => [
                styles.filterChip,
                activeFilter === filter && styles.filterChipActive,
                pressed && styles.pressedState
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                {filter}
              </Text>
            </Pressable>
          ))}
        </Animated.ScrollView>
      </View>

      <Animated.ScrollView
        style={styles.contentArea}
        contentContainerStyle={styles.contentPadding}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {activeFilter === 'Recent' && <RecentScheduleWrapper />}
        {activeFilter === 'Schedules' && <ScheduleView />}
      </Animated.ScrollView>

      {isFabOpen && (
        <Pressable
          style={styles.dimOverlay}
          onPress={() => setIsFabOpen(false)}
        />
      )}

      <Animated.View
        style={[
          styles.bottomWrapper,
          {
            paddingBottom: insets.bottom + spacing.xl,
            opacity: isFabOpen ? 1 : fabOpacity,
            transform: [{ translateY: isFabOpen ? 0 : fabTranslateY }]
          }
        ]}
      >
        {isFabOpen && (
          <View style={styles.fabMenuContainer}>
            <View style={styles.fabMenu}>
              <Pressable style={({ pressed }) => [styles.fabMenuItem, pressed && styles.pressedState]}>
                <MaterialIcon name="crop-free" size={22} color={palette.ink} />
                <Text style={styles.fabMenuText}>Scan COR (Camera)</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.fabMenuItem, pressed && styles.pressedState]}>
                <MaterialIcon name="image" size={22} color={palette.ink} />
                <Text style={styles.fabMenuText}>Upload Image</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.fabMenuItem, pressed && styles.pressedState]}
                onPress={() => {
                  setIsFabOpen(false);
                  navigation.navigate('ManualEntry');
                }}
              >
                <MaterialIcon name="edit" size={22} color={palette.ink} />
                <Text style={styles.fabMenuText}>Manual Entry</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.fabRow}>
          <Pressable
            style={({ pressed }) => [
              styles.fabCamera,
              pressed && styles.fabPressed
            ]}
          >
            <MaterialIcon name="photo-camera" size={26} color={palette.ink} />
          </Pressable>

          <Pressable
            onPress={() => setIsFabOpen(!isFabOpen)}
            style={({ pressed }) => [
              styles.fabCreate,
              isFabOpen && styles.fabCreateActive,
              pressed && styles.fabPressed
            ]}
          >
            <MaterialIcon
              name={isFabOpen ? "close" : "add"}
              size={24}
              color={isFabOpen ? palette.primary : palette.surface}
              style={styles.fabCreateIcon}
            />
            <Text style={[styles.fabCreateText, isFabOpen && styles.fabCreateTextActive]}>
              {isFabOpen ? "Cancel" : "Create New"}
            </Text>
          </Pressable>
        </View>
      </Animated.View>

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
  contentPadding: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 160 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 28, 30, 0.04)',
    padding: 16,
    borderRadius: 24,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  cardIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg
  },
  cardTextGroup: {
    flex: 1,
    justifyContent: 'center'
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.ink,
    marginBottom: 4,
    letterSpacing: -0.2
  },
  cardSubtitle: {
    fontSize: 14,
    color: palette.muted,
    fontWeight: '500'
  },

  pressedState: {
    opacity: 0.7,
  },

  /* --- NEW SUBTLE BORDERLESS EMPTY STATE STYLES --- */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.muted,
    marginTop: 12,
    textAlign: 'center'
  },
  emptyStateSub: {
    fontSize: 14,
    color: palette.muted,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.8
  },

  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(251, 251, 253, 0.9)', zIndex: 10 },

  bottomWrapper: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', zIndex: 20 },
  fabMenuContainer: { width: '100%', alignItems: 'center', paddingLeft: 64, marginBottom: spacing.md },
  fabMenu: { backgroundColor: palette.surface, width: 220, borderRadius: 20, paddingVertical: spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8, borderWidth: 1, borderColor: palette.border },
  fabMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  fabMenuText: { fontSize: 16, fontWeight: '600', color: palette.ink, marginLeft: spacing.md },

  fabRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },

  fabCamera: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: palette.border
  },
  fabCreate: {
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6
  },
  fabCreateActive: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    shadowOpacity: 0,
    elevation: 0
  },
  fabCreateIcon: { marginRight: spacing.xs },
  fabCreateText: { color: palette.surface, fontSize: 17, fontWeight: '700' },
  fabCreateTextActive: { color: palette.primary },

  fabPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
});