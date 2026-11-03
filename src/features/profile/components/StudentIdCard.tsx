import React, {memo, useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {palette} from '../../../tokens';
import type {StudentProfile} from '../data/profileStore';

interface Props {
  profile: StudentProfile;
  academicTerm?: string;
  subjectCount: number;
  units: number;
  onOpenSchedule: () => void;
}

export const StudentIdCard = memo(function StudentIdCard({
  profile,
  academicTerm,
  subjectCount,
  units,
  onOpenSchedule,
}: Props) {
  const [flipped, setFlipped] = useState(false),
    [turning, setTurning] = useState(false);
  const [heights, setHeights] = useState({front: 0, back: 0});
  const {fontScale} = useWindowDimensions();
  const compactHint = fontScale > 1.3;
  const footerSpace = Math.max(66, 44 * fontScale);
  const progress = useRef(new Animated.Value(0)).current;
  const animation = useRef<Animated.CompositeAnimation>();
  const mounted = useRef(false),
    busy = useRef(false),
    back = useRef(false),
    reducedMotion = useRef(false);
  const transforms = useMemo(
    () => ({
      front: progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
      }),
      back: progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['180deg', '360deg'],
      }),
      frontOpacity: progress.interpolate({
        inputRange: [0, 0.499, 0.5, 1],
        outputRange: [1, 1, 0, 0],
      }),
      backOpacity: progress.interpolate({
        inputRange: [0, 0.5, 0.501, 1],
        outputRange: [0, 0, 1, 1],
      }),
    }),
    [progress],
  );
  useEffect(() => {
    mounted.current = true;
    let receivedChange = false;
    const updateMotion = (enabled: boolean) => {
      if (!mounted.current) return;
      reducedMotion.current = enabled;
      if (enabled && busy.current) {
        animation.current?.stop();
        progress.setValue(back.current ? 1 : 0);
        busy.current = false;
        setTurning(false);
      }
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (!receivedChange) updateMotion(enabled);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      enabled => {
        receivedChange = true;
        updateMotion(enabled);
      },
    );
    return () => {
      mounted.current = false;
      animation.current?.stop();
      subscription.remove();
    };
  }, [progress]);
  const turn = () => {
    if (busy.current) return;
    const next = !back.current;
    back.current = next;
    setFlipped(next);
    if (reducedMotion.current) {
      progress.setValue(next ? 1 : 0);
      return;
    }
    busy.current = true;
    setTurning(true);
    animation.current = Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: 340,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.current.start(({finished}) => {
      if (!mounted.current) return;
      if (!finished) progress.setValue(back.current ? 1 : 0);
      busy.current = false;
      setTurning(false);
    });
  };
  // Measure natural content on both sides so a turn never shifts the page or clips large text.
  const measure = (side: 'front' | 'back', event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setHeights(current =>
      Math.abs(current[side] - height) < 1
        ? current
        : {...current, [side]: height},
    );
  };
  const college = profile.college || 'College not set';
  const initials = profile.name
    .split(/\s+/)
    .slice(0, 2)
    .map(name => name[0])
    .join('')
    .toUpperCase();
  return (
    <View
      testID="student-id-card"
      style={{height: Math.max(236, heights.front, heights.back)}}>
      <Animated.View
        testID="student-id-front"
        pointerEvents={flipped || turning ? 'none' : 'auto'}
        accessibilityElementsHidden={flipped || turning}
        importantForAccessibility={
          flipped || turning ? 'no-hide-descendants' : 'auto'
        }
        style={[
          styles.face,
          styles.front,
          {
            opacity: transforms.frontOpacity,
            transform: [{perspective: 1200}, {rotateY: transforms.front}],
          },
        ]}>
        <Pressable
          style={styles.touchArea}
          accessibilityRole="button"
          accessibilityLabel={`${profile.name}, ${college}, Mindanao State University. Show schedule details`}
          accessibilityHint="Turns your student card over"
          accessibilityState={{busy: turning, disabled: flipped || turning}}
          disabled={flipped || turning}
          onPress={turn}>
          <View
            onLayout={event => measure('front', event)}
            style={[styles.frontContent, {paddingBottom: footerSpace}]}>
            <View style={styles.universityRow}>
              <View style={styles.logoFrame}>
                <Image
                  source={require('../../../../assets/images/msuLogo.png')}
                  style={styles.logo}
                />
              </View>
              <Text style={styles.university}>Mindanao State University</Text>
            </View>
            <View style={styles.goldLine} />
            <View style={styles.identity}>
              <View style={styles.avatar}>
                <Text style={styles.initials}>{initials}</Text>
              </View>
              <View style={styles.grow}>
                <Text style={styles.name}>{profile.name}</Text>
                <Text style={styles.college}>{college}</Text>
              </View>
            </View>
          </View>
          <View style={styles.frontFooter} pointerEvents="none">
            <Text style={styles.studentLabel}>STUDENT</Text>
            <View style={styles.turnHint}>
              <MaterialIcon name="flip" size={17} color={palette.secondary} />
              {!compactHint && (
                <Text style={styles.frontHint}>Tap to turn</Text>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
      <Animated.View
        testID="student-id-back"
        pointerEvents={!flipped || turning ? 'none' : 'auto'}
        accessibilityElementsHidden={!flipped || turning}
        importantForAccessibility={
          !flipped || turning ? 'no-hide-descendants' : 'auto'
        }
        style={[
          styles.face,
          styles.back,
          {
            opacity: transforms.backOpacity,
            transform: [{perspective: 1200}, {rotateY: transforms.back}],
          },
        ]}>
        <Pressable
          style={styles.touchArea}
          accessibilityRole="button"
          accessibilityLabel={`${academicTerm || 'Schedule'}, ${subjectCount} ${
            subjectCount === 1 ? 'subject' : 'subjects'
          }, ${units} ${units === 1 ? 'unit' : 'units'}. ${profile.yearLevel}${
            profile.course ? `, ${profile.course}` : ''
          }${
            profile.studentId ? `, ID ${profile.studentId}` : ''
          }. Show student ID`}
          accessibilityHint="Turns back to your name and college"
          accessibilityState={{busy: turning, disabled: !flipped || turning}}
          disabled={!flipped || turning}
          onPress={turn}>
          <View
            onLayout={event => measure('back', event)}
            style={[styles.backContent, {paddingBottom: footerSpace}]}>
            <Text style={styles.term}>{academicTerm || 'Schedule'}</Text>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.value}>{subjectCount}</Text>
                <Text style={styles.statLabel}>Subjects</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.stat}>
                <Text style={styles.value}>{units}</Text>
                <Text style={styles.statLabel}>Units</Text>
              </View>
            </View>
            <View style={styles.details}>
              {!!profile.course && (
                <Text style={styles.course}>{profile.course}</Text>
              )}
              <Text style={styles.detail}>
                {profile.yearLevel}
                {profile.studentId ? ` · ${profile.studentId}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.backHint} pointerEvents="none">
            <MaterialIcon name="flip" size={17} color={palette.muted} />
            {!compactHint && (
              <Text style={styles.backHintText}>Tap to turn</Text>
            )}
          </View>
        </Pressable>
        <Pressable
          style={styles.scheduleLink}
          accessibilityRole="button"
          accessibilityLabel="View schedule"
          disabled={!flipped || turning}
          onPress={onOpenSchedule}>
          <Text style={styles.scheduleLinkText}>View schedule</Text>
          <MaterialIcon
            name="chevron-right"
            size={19}
            color={palette.primary}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  front: {backgroundColor: palette.primary},
  back: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  touchArea: {flex: 1},
  grow: {flex: 1, minWidth: 0},
  frontContent: {padding: 20, paddingBottom: 60},
  universityRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  logoFrame: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
  },
  logo: {width: 31, height: 34, resizeMode: 'contain'},
  university: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: palette.bg,
  },
  goldLine: {
    height: 1,
    backgroundColor: 'rgba(197,160,89,0.5)',
    marginVertical: 18,
  },
  identity: {flexDirection: 'row', alignItems: 'center', gap: 14},
  avatar: {
    width: 54,
    height: 58,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {fontSize: 22, fontWeight: '700', color: palette.surface},
  name: {fontSize: 23, fontWeight: '700', color: palette.bg},
  college: {fontSize: 13, lineHeight: 20, color: palette.surface, marginTop: 7},
  frontFooter: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  studentLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '600',
    color: palette.surface,
  },
  turnHint: {flexDirection: 'row', alignItems: 'center', gap: 6},
  frontHint: {fontSize: 12, color: palette.surface},
  backContent: {padding: 20, paddingBottom: 66},
  term: {fontSize: 21, color: palette.ink, fontWeight: '700'},
  stats: {flexDirection: 'row', alignItems: 'center', marginVertical: 18},
  stat: {flex: 1, alignItems: 'center', gap: 3},
  value: {fontSize: 28, fontWeight: '700', color: palette.ink},
  statLabel: {fontSize: 12, color: palette.muted},
  divider: {width: 1, height: 38, backgroundColor: palette.border},
  details: {gap: 6},
  course: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: palette.body,
  },
  detail: {fontSize: 12, lineHeight: 18, color: palette.body},
  backHint: {
    position: 'absolute',
    bottom: 22,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backHintText: {fontSize: 12, color: palette.muted},
  scheduleLink: {
    position: 'absolute',
    bottom: 9,
    right: 12,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 2,
    maxWidth: '80%',
  },
  scheduleLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.primary,
    flexShrink: 1,
    textAlign: 'right',
  },
});
