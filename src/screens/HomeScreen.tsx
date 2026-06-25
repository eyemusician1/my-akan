import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  DeviceEventEmitter
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';

import { palette, spacing } from '../tokens';
import { ScheduleView } from '../features/schedule/components/ScheduleView';
import { database } from '../core/database';
import Schedule from '../core/database/models/Schedule';
import Subject from '../core/database/models/Subject';

const getTimeAgo = (dateInput: any) => {
  if (!dateInput) return 'Just now';
  const date = new Date(dateInput);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} mins ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hr ago';
  if (hours < 24) return `${hours} hrs ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
};

const ScheduleCardItemUI = ({ schedule, subjects }: { schedule: Schedule, subjects: Subject[] }) => {
  const navigation = useNavigation<any>();
  const subjectCount = subjects.length;
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTicker(t => t + 1), 20000);
    return () => clearInterval(timer);
  }, []);

  if (subjectCount === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcon name="folder-open" size={32} color={palette.muted} />
        <Text style={styles.emptyStateTitle}>Schedule is empty</Text>
        <Text style={styles.emptyStateSub}>Add subjects via manual entry or scanner.</Text>
      </View>
    );
  }

  const targetDate = (schedule as any).updatedAt || schedule.createdAt;

  return (
    <Pressable
      style={({ pressed }: { pressed: boolean }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => navigation.navigate('RecentSchedules')}
    >
      <View style={styles.cardIconBox}>
        <MaterialIcon name="event-note" size={28} color={palette.secondary} />
      </View>
      <View style={styles.cardTextGroup}>
        <Text style={styles.cardTitle}>{schedule.academicTerm} Schedule</Text>
        <Text style={styles.cardSubtitle}>
          {subjectCount} subject{subjectCount !== 1 ? 's' : ''} • Updated {getTimeAgo(targetDate)}
        </Text>
      </View>
    </Pressable>
  );
};

const EnhancedScheduleCardItem = withObservables(['schedule'], ({ schedule }: { schedule: Schedule }) => ({
  schedule: schedule.observe(),
  subjects: schedule.subjects.observe(),
}))(ScheduleCardItemUI);

const RecentScheduleListUI = ({ schedules }: { schedules: Schedule[] }) => {
  const latestSchedule = schedules[0];

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
  schedules: database.get<Schedule>('schedules').query(Q.sortBy('created_at', Q.desc)).observe(),
}))(RecentScheduleListUI);


export function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('Recent');
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [userName, setUserName] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(15)).current;
  const toastTimerRef = useRef<any>(null);

  const triggerToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastOpacity.setValue(0);
    toastTranslateY.setValue(15);

    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(toastTranslateY, { toValue: 0, useNativeDriver: true, speed: 12 }),
    ]).start();

    toastTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(toastTranslateY, { toValue: 15, duration: 200, useNativeDriver: true }),
      ]).start(() => setToastMessage(null));
    }, 2500);
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('SHOW_TOAST', triggerToast);
    return () => sub.remove();
  }, [triggerToast]);

  const filters = ['Recent', 'Schedules', 'Payments', 'Archived'];

  const scrollY = useRef(new Animated.Value(0)).current;
  const clampedScrollY = Animated.diffClamp(scrollY, 0, 100);

  const fabScrollTranslateY = clampedScrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 130],
    extrapolate: 'clamp',
  });

  const fabScrollOpacity = clampedScrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const fabAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fabAnimation, {
      toValue: isFabOpen ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
      tension: 50,
    }).start();
  }, [isFabOpen]);

  const item1TranslateY = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  const item2TranslateY = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
  const item3TranslateY = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
  const itemScale = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  const fabRotate = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  useFocusEffect(
    useCallback(() => {
      const fetchUserName = async () => {
        try {
          const storedName = await AsyncStorage.getItem('@user_name');
          if (storedName) {
            setUserName(storedName);
          }
        } catch (e) {
          console.error("Failed to load user name", e);
        }
      };

      const cleanupEmptySchedules = async () => {
        try {
          const schedules = await database.get<Schedule>('schedules').query().fetch();
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

      fetchUserName();
      cleanupEmptySchedules();
    }, [])
  );

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

        <TouchableOpacity
          style={styles.avatar}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Profile')}
        >
          {userName ? (
            <Text style={styles.avatarInitial}>{userName.charAt(0).toUpperCase()}</Text>
          ) : (
            <MaterialIcon name="person" size={20} color={palette.surface} />
          )}
        </TouchableOpacity>
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
              style={({ pressed }: { pressed: boolean }) => [
                styles.filterChip,
                activeFilter === filter && styles.filterChipActive,
                pressed && styles.pressedState
              ]}
              onPress={() => {
                // INTERCEPT: If they tap Payments, open the Finance screen.
                // Otherwise, safely swap the local tab filter.
                if (filter === 'Payments') {
                  navigation.navigate('Finance');
                } else {
                  setActiveFilter(filter);
                }
              }}
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

      <Animated.View
        style={[styles.dimOverlay, { opacity: fabAnimation }]}
        pointerEvents={isFabOpen ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsFabOpen(false)} />
      </Animated.View>

      <Animated.View
        style={[
          styles.fabContainer,
          {
            bottom: insets.bottom + spacing.xl,
            opacity: isFabOpen ? 1 : fabScrollOpacity,
            transform: [{ translateY: isFabOpen ? 0 : fabScrollTranslateY }]
          }
        ]}
      >
        <View style={styles.fabMenuContainer} pointerEvents={isFabOpen ? 'auto' : 'none'}>

          <Animated.View style={{ opacity: fabAnimation, transform: [{ translateY: item3TranslateY }, { scale: itemScale }] }}>
            <TouchableOpacity
              style={styles.fabPill}
              activeOpacity={0.8}
              onPress={() => {
                setIsFabOpen(false);
                navigation.navigate('Scanner', { mode: 'camera' });
              }}
            >
              <MaterialIcon name="crop-free" size={20} color={palette.ink} />
              <Text style={styles.fabPillText}>Scan COR (Camera)</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ opacity: fabAnimation, transform: [{ translateY: item2TranslateY }, { scale: itemScale }] }}>
            <TouchableOpacity
              style={styles.fabPill}
              activeOpacity={0.8}
              onPress={() => {
                setIsFabOpen(false);
                navigation.navigate('Scanner', { mode: 'gallery' });
              }}
            >
              <MaterialIcon name="image" size={20} color={palette.ink} />
              <Text style={styles.fabPillText}>Upload Image</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ opacity: fabAnimation, transform: [{ translateY: item1TranslateY }, { scale: itemScale }] }}>
            <TouchableOpacity
              style={styles.fabPill}
              activeOpacity={0.8}
              onPress={() => {
                setIsFabOpen(false);
                navigation.navigate('ManualEntry');
              }}
            >
              <MaterialIcon name="edit" size={20} color={palette.ink} />
              <Text style={styles.fabPillText}>Manual Entry</Text>
            </TouchableOpacity>
          </Animated.View>

        </View>

        <TouchableWithoutFeedback onPress={() => setIsFabOpen(!isFabOpen)}>
          <Animated.View style={[styles.mainFab, { transform: [{ rotate: fabRotate }] }]}>
            <MaterialIcon name="add" size={32} color={palette.surface} />
          </Animated.View>
        </TouchableWithoutFeedback>

      </Animated.View>

      {/* MASTER ROOT TOAST (Hovers 18px above the circular FAB) */}
      {toastMessage && (
        <Animated.View
          style={[
            styles.toastRootContainer,
            {
              bottom: insets.bottom + 116,
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
  avatarInitial: { fontSize: 18, fontWeight: '700', color: palette.surface },

  filterContainer: { height: 50 },
  filterScroll: { paddingHorizontal: spacing.xl, alignItems: 'center', gap: spacing.sm },
  filterChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.bg },
  filterChipActive: { backgroundColor: palette.ink, borderColor: palette.ink },
  filterText: { fontSize: 14, fontWeight: '500', color: palette.body },
  filterTextActive: { color: palette.surface },

  contentArea: { flex: 1 },
  contentPadding: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 160 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(28, 28, 30, 0.04)', padding: 16, borderRadius: 24 },
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  cardIconBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(197, 160, 89, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: spacing.lg },
  cardTextGroup: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: palette.ink, marginBottom: 4, letterSpacing: -0.2 },
  cardSubtitle: { fontSize: 14, color: palette.muted, fontWeight: '500' },
  pressedState: { opacity: 0.7 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyStateTitle: { fontSize: 16, fontWeight: '600', color: palette.muted, marginTop: 12, textAlign: 'center' },
  emptyStateSub: { fontSize: 14, color: palette.muted, marginTop: 4, textAlign: 'center', opacity: 0.8 },

  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(250, 246, 239, 0.92)', zIndex: 10 },

  fabContainer: { position: 'absolute', right: spacing.xl, alignItems: 'flex-end', zIndex: 20 },
  fabMenuContainer: { alignItems: 'flex-end', marginBottom: spacing.md, gap: 12 },
  fabPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: palette.border },
  fabPillText: { fontSize: 15, fontWeight: '600', color: palette.ink, marginLeft: spacing.sm },
  mainFab: { width: 66, height: 66, borderRadius: 22, backgroundColor: palette.primary, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: palette.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16 },

  // Master Root Toast Styles
  toastRootContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 9999, pointerEvents: 'none' },
  toastPill: { backgroundColor: palette.ink, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  toastText: { color: palette.surface, fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
});