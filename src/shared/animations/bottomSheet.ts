import {Animated} from 'react-native';

export const SHEET_CLOSED_OFFSET = 600;

/** Shared motion for payment forms and grade entry. Callers own visibility. */
export function enterBottomSheet(
  opacity: Animated.Value,
  translateY: Animated.Value,
) {
  opacity.setValue(0);
  translateY.setValue(SHEET_CLOSED_OFFSET);
  return Animated.parallel([
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
      isInteraction: false,
    }),
    Animated.spring(translateY, {
      toValue: 0,
      tension: 65,
      friction: 9,
      useNativeDriver: true,
      isInteraction: false,
    }),
  ]);
}

export function exitBottomSheet(
  opacity: Animated.Value,
  translateY: Animated.Value,
) {
  return Animated.parallel([
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
      isInteraction: false,
    }),
    Animated.timing(translateY, {
      toValue: SHEET_CLOSED_OFFSET,
      duration: 200,
      useNativeDriver: true,
      isInteraction: false,
    }),
  ]);
}
