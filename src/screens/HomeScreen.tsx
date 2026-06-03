import React, { useState, useRef } from 'react';
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
import { palette, spacing } from '../tokens/colors';
import { ScheduleView } from '../features/schedule/components/ScheduleView';

export function HomeScreen() {
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

  const renderRecent = () => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed
      ]}
    >
      <View style={styles.cardIconBox}>
        <MaterialIcon name="event-note" size={28} color={palette.secondary} />
      </View>
      <View style={styles.cardTextGroup}>
        <Text style={styles.cardTitle}>1st Semester Schedule</Text>
        <Text style={styles.cardSubtitle}>8 subjects • Updated 2 hrs ago</Text>
      </View>
    </Pressable>
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
          <Text style={styles.headerTitle}>Trak'n</Text>
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
        {activeFilter === 'Recent' && renderRecent()}
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
              <Pressable style={({ pressed }) => [styles.fabMenuItem, pressed && styles.pressedState]}>
                <MaterialIcon name="edit" size={22} color={palette.ink} />
                <Text style={styles.fabMenuText}>Manual Entry</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.fabRow}>
          {/* Animated Camera Button */}
          <Pressable
            style={({ pressed }) => [
              styles.fabCamera,
              pressed && styles.fabPressed
            ]}
          >
            <MaterialIcon name="photo-camera" size={26} color={palette.ink} />
          </Pressable>

          {/* Animated Create New Button */}
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
              // CHANGED: Uses maroon (primary) when open, white (surface) when closed
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

  /* --- REDESIGNED RECENT CARD --- */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 28, 30, 0.04)',
    padding: 16, // Smoother internal padding
    borderRadius: 24,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }], // Subtle press-in effect
    opacity: 0.9,
  },
  cardIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(197, 160, 89, 0.15)', // Warmer background for the icon
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

  /* --- GLOBAL ANIMATION STATES --- */
  pressedState: {
    opacity: 0.7,
  },

  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(251, 251, 253, 0.9)', zIndex: 10 },

  bottomWrapper: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', zIndex: 20 },
  fabMenuContainer: { width: '100%', alignItems: 'center', paddingLeft: 64, marginBottom: spacing.md },
  fabMenu: { backgroundColor: palette.surface, width: 220, borderRadius: 20, paddingVertical: spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8, borderWidth: 1, borderColor: palette.border },
  fabMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  fabMenuText: { fontSize: 16, fontWeight: '600', color: palette.ink, marginLeft: spacing.md },

  fabRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },

  /* --- PROMINENT FABS --- */
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
    backgroundColor: palette.primary, // CHANGED: Now uses your Maroon brand color
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    shadowColor: palette.primary, // CHANGED: Tints the drop shadow maroon for a premium glow
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
  fabCreateTextActive: { color: palette.primary }, // CHANGED: "Cancel" text turns maroon

  /* Button Animation */
  fabPressed: {
    transform: [{ scale: 0.95 }], // Gives the buttons a satisfying tactile squish
    opacity: 0.9,
  },
});