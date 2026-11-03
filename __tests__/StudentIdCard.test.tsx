import React from 'react';
import {afterEach, beforeEach, expect, it, jest} from '@jest/globals';
import {AccessibilityInfo, Animated, Pressable} from 'react-native';
import renderer from 'react-test-renderer';
import {StudentIdCard} from '../src/features/profile/components/StudentIdCard';

jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcon');
const profile = {
  name: 'Alex Reyes',
  yearLevel: 'Junior',
  studentId: '2026-A12',
  course: 'BS Information Technology',
  college: 'College of Information and Computing Sciences (CICS)',
};
let screen: renderer.ReactTestRenderer;
const openSchedule = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(true);
});
afterEach(() => {
  renderer.act(() => screen?.unmount());
  jest.restoreAllMocks();
});
async function renderCard() {
  await renderer.act(async () => {
    screen = renderer.create(
      <StudentIdCard
        profile={profile}
        academicTerm="2nd Sem"
        subjectCount={6}
        units={18}
        onOpenSchedule={openSchedule}
      />,
    );
  });
}
const face = (side: string) =>
  screen.root.findAllByProps({testID: `student-id-${side}`})[0];
const button = (ending: string) =>
  screen.root
    .findAllByType(Pressable)
    .find(node => node.props.accessibilityLabel?.endsWith(ending))!;

it('shows one accessible face and turns both ways without navigating on a card tap', async () => {
  await renderCard();
  expect(button('Show schedule details').props.accessibilityLabel).toContain(
    profile.college,
  );
  expect(button('Show schedule details').props.accessibilityLabel).toContain(
    'Mindanao State University',
  );
  expect(face('front').props.accessibilityElementsHidden).toBe(false);
  expect(face('back').props.importantForAccessibility).toBe(
    'no-hide-descendants',
  );
  expect(button('View schedule').props.disabled).toBe(true);
  renderer.act(() => button('Show schedule details').props.onPress());
  expect(face('front').props.accessibilityElementsHidden).toBe(true);
  expect(face('back').props.accessibilityElementsHidden).toBe(false);
  expect(button('Show student ID').props.accessibilityLabel).toContain(
    '6 subjects, 18 units',
  );
  expect(openSchedule).not.toHaveBeenCalled();
  renderer.act(() => button('View schedule').props.onPress());
  expect(openSchedule).toHaveBeenCalledTimes(1);
  expect(face('back').props.accessibilityElementsHidden).toBe(false);
  renderer.act(() => button('Show student ID').props.onPress());
  expect(face('front').props.accessibilityElementsHidden).toBe(false);
});

it('respects Reduce Motion and updates details without resetting the selected face', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  await renderCard();
  renderer.act(() => button('Show schedule details').props.onPress());
  expect(timing).not.toHaveBeenCalled();
  await renderer.act(async () => {
    screen.update(
      <StudentIdCard
        profile={{...profile, college: 'College of Engineering (COE)'}}
        academicTerm="2nd Sem"
        subjectCount={7}
        units={21}
        onOpenSchedule={openSchedule}
      />,
    );
  });
  expect(face('back').props.accessibilityElementsHidden).toBe(false);
  expect(button('Show student ID').props.accessibilityLabel).toContain(
    '7 subjects, 21 units',
  );
  renderer.act(() => button('Show student ID').props.onPress());
  expect(button('Show schedule details').props.accessibilityLabel).toContain(
    'College of Engineering (COE)',
  );
});

it('ignores rapid taps while turning and releases the controls after the animation', async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(false);
  let complete!: (result: {finished: boolean}) => void;
  const timing = jest.spyOn(Animated, 'timing').mockImplementation(() => ({
    start: callback => {
      complete = callback!;
    },
    stop: jest.fn(),
    reset: jest.fn(),
  }));
  await renderCard();
  const turn = button('Show schedule details').props.onPress;
  renderer.act(() => {
    turn();
    turn();
    turn();
  });
  expect(timing).toHaveBeenCalledTimes(1);
  expect(timing).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({useNativeDriver: true, isInteraction: false}),
  );
  expect(button('View schedule').props.disabled).toBe(true);
  renderer.act(() => complete({finished: false}));
  expect(button('View schedule').props.disabled).toBe(false);
  expect(face('back').props.style[2].opacity.__getValue()).toBe(1);
  renderer.act(() => button('Show student ID').props.onPress());
  expect(timing).toHaveBeenCalledTimes(2);
});

it('finishes without motion if Reduce Motion is enabled during a turn, and cleans up', async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(false);
  let motionChanged!: (enabled: boolean) => void;
  const remove = jest.fn(),
    stop = jest.fn();
  const subscribe = (_name: string, listener: (enabled: boolean) => void) => {
    motionChanged = listener;
    return {remove};
  };
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockImplementation(
      subscribe as unknown as typeof AccessibilityInfo.addEventListener,
    );
  jest
    .spyOn(Animated, 'timing')
    .mockImplementation(() => ({start: () => {}, stop, reset: () => {}}));
  await renderCard();
  renderer.act(() => button('Show schedule details').props.onPress());
  renderer.act(() => motionChanged(true));
  expect(stop).toHaveBeenCalledTimes(1);
  expect(face('back').props.accessibilityElementsHidden).toBe(false);
  expect(button('View schedule').props.disabled).toBe(false);
  renderer.act(() => screen.unmount());
  expect(remove).toHaveBeenCalledTimes(1);
});
