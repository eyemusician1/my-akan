import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { palette, spacing } from '../tokens';
import { useToast } from '../shared/hooks/useToast';
import { ScheduleView } from '../features/schedule/components/ScheduleView';
import {RecentOverview} from '../features/schedule/components/RecentOverview';
import {ArchiveOverview} from '../features/schedule/components/ArchiveOverview';
import {GradeBook} from '../features/grades/components/GradeBook';
import {AppScreenProps} from '../navigation/types';
import { scheduleRepository } from '../features/schedule/data';
import { refreshScheduleIntegrations } from '../features/schedule/services/scheduleService';

// Import our offline schematic map modal and parser
import { CampusMapModal, locateBuildingByRoom } from './CampusMapModal';

export function HomeScreen({ navigation, route }: AppScreenProps<'Home'>) {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<string>(route.params?.tab ?? 'Recent');
  useEffect(() => {if (route.params?.tab) setActiveFilter(route.params.tab);}, [route.params?.tab, route.params?.gradeScheduleId]);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const didRunCleanupRef = useRef(false);

  // --- MAP MODAL STATES ---
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [targetBuildingId, setTargetBuildingId] = useState<string | null>(null);

  const {message: toastMessage, opacity: toastOpacity, translateY: toastTranslateY, showToast: triggerToast} = useToast();

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('SHOW_TOAST', triggerToast);
    return () => sub.remove();
  }, [triggerToast]);

  const filters = ['Recent', 'Schedules', 'Grades', 'Payments', 'Archive'];

  const scrollY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    scrollY.setValue(0);
    setIsFabOpen(false);
  }, [activeFilter, scrollY]);
  const clampedScrollY = useMemo(() => Animated.diffClamp(scrollY, 0, 100), [scrollY]);

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

  // --- UPGRADED 4-ITEM FAB INTERPOLATIONS ---
  const item1TranslateY = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  const item2TranslateY = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
  const item3TranslateY = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
  const item4TranslateY = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
  const item5TranslateY = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: [100, 0] });
  const itemScale = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  const fabRotate = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  const handleOpenMap = useCallback((roomString?: string | null) => {
    const bId = locateBuildingByRoom(roomString);
    setTargetBuildingId(bId);
    setIsMapModalVisible(true);
  }, []);
  const openSchedule = useCallback((scheduleId: string) => navigation.navigate('RecentSchedules', {scheduleId}), [navigation]);
  const openSubject = useCallback((editSubjectId: string) => navigation.navigate('ManualEntry', {editSubjectId}), [navigation]);
  const calculateGrades = useCallback((scheduleId: string) => navigation.navigate('GradeCalculator', {scheduleId, autoCalculate: true}), [navigation]);

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
          await scheduleRepository.cleanupEmptySchedules();
        } catch (error) {
          console.error("Cleanup failed", error);
        }
      };

      fetchUserName();

      if (!didRunCleanupRef.current) {
        didRunCleanupRef.current = true;
        cleanupEmptySchedules().then(() => refreshScheduleIntegrations());
      }
    }, [])
  );

  return (
    <View style={styles.container}>

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/images/TraknLogo2.png')}
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
              accessibilityRole="tab"
              accessibilityState={{selected: activeFilter === filter}}
              style={({ pressed }: { pressed: boolean }) => [
                styles.filterChip,
                activeFilter === filter && styles.filterChipActive,
                pressed && styles.pressedState
              ]}
              onPress={() => {
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
        key={activeFilter}
        testID="home-tab-content"
        style={styles.contentArea}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentPadding}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* TAB ROUTING ENGINE */}
        {activeFilter === 'Recent' && <RecentOverview onOpenSchedule={openSchedule} onOpenSubject={openSubject} />}
        {activeFilter === 'Schedules' && (
          <ScheduleView onLocateRoom={handleOpenMap} />
        )}
        {activeFilter === 'Grades' && <GradeBook initialScheduleId={route.params?.gradeScheduleId} onCalculate={calculateGrades} />}
        {activeFilter === 'Archive' && <ArchiveOverview onOpenSchedule={openSchedule} />}
      </Animated.ScrollView>

      <Animated.View
        style={[styles.dimOverlay, { opacity: fabAnimation }]}
        pointerEvents={isFabOpen ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsFabOpen(false)} />
      </Animated.View>

      <Animated.View
        testID="home-fab-layer"
        pointerEvents="box-none"
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
          <Animated.View style={{opacity: fabAnimation, transform: [{translateY: item5TranslateY}, {scale: itemScale}]}}>
            <TouchableOpacity style={styles.fabPill} activeOpacity={0.8} onPress={() => {setIsFabOpen(false); navigation.navigate('GradeCalculator');}}>
              <MaterialIcon name="calculate" size={20} color={palette.primary} />
              <Text style={styles.fabPillText}>GPA calculator</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ITEM 4: CAMPUS MAP DIRECTORY */}
          <Animated.View style={{ opacity: fabAnimation, transform: [{ translateY: item4TranslateY }, { scale: itemScale }] }}>
            <TouchableOpacity
              style={styles.fabPill}
              activeOpacity={0.8}
              onPress={() => {
                setIsFabOpen(false);
                handleOpenMap(null); // Opens general campus overview
              }}
            >
              <MaterialIcon name="map" size={20} color={palette.primary} />
              <Text style={styles.fabPillText}>Campus Map</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ITEM 3: SCAN COR (CAMERA) */}
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

          {/* ITEM 2: UPLOAD COR IMAGE */}
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

          {/* ITEM 1: MANUAL ENTRY */}
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

        <TouchableWithoutFeedback accessibilityRole="button" accessibilityLabel={isFabOpen ? 'Close menu' : 'Open menu'} accessibilityState={{expanded: isFabOpen}} onPress={() => setIsFabOpen(!isFabOpen)}>
          <Animated.View style={[styles.mainFab, { transform: [{ rotate: fabRotate }] }]}>
            <MaterialIcon name="add" size={32} color={palette.surface} />
          </Animated.View>
        </TouchableWithoutFeedback>

      </Animated.View>

      {/* OFFLINE SCHEMATIC MAP MODAL */}
      <CampusMapModal
        visible={isMapModalVisible}
        onClose={() => setIsMapModalVisible(false)}
        targetBuildingId={targetBuildingId}
      />

      {/* MASTER ROOT TOAST */}
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

  pressedState: { opacity: 0.7 },


  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(250, 246, 239, 0.92)', zIndex: 10 },

  fabContainer: { position: 'absolute', right: spacing.xl, alignItems: 'flex-end', zIndex: 20 },
  fabMenuContainer: { alignItems: 'flex-end', marginBottom: spacing.md, gap: 12 },
  fabPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: palette.border },
  fabPillText: { fontSize: 15, fontWeight: '600', color: palette.ink, marginLeft: spacing.sm },
  mainFab: { width: 66, height: 66, borderRadius: 22, backgroundColor: palette.primary, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: palette.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16 },

  toastRootContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 9999, pointerEvents: 'none' },
  toastPill: { backgroundColor: palette.ink, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  toastText: { color: palette.surface, fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
});
