import React from 'react';
import {afterEach, beforeEach, expect, it, jest} from '@jest/globals';
import {AccessibilityInfo, Modal, Pressable, Text} from 'react-native';
import renderer from 'react-test-renderer';
import {GradePicker} from '../src/features/grades/components/GradePicker';
import {
  enterBottomSheet,
  exitBottomSheet,
} from '../src/shared/animations/bottomSheet';
import type {GradeBookSubject} from '../src/features/grades/domain/gpa';

jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0}),
}));
jest.mock('../src/shared/animations/bottomSheet', () => ({
  SHEET_CLOSED_OFFSET: 600,
  enterBottomSheet: jest.fn(),
  exitBottomSheet: jest.fn(),
}));
let screen: renderer.ReactTestRenderer;
let exits: Array<(result: {finished: boolean}) => void>;
const first: GradeBookSubject = {
  id: 'first',
  scheduleId: 'term',
  code: 'CSC101',
  title: 'Computing',
  units: 3,
  grade: 1,
};
const second = {...first, id: 'second', code: 'MAT101', title: 'Mathematics'};
beforeEach(() => {
  exits = [];
  jest.clearAllMocks();
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(false);
  jest
    .mocked(enterBottomSheet)
    .mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    }));
  jest.mocked(exitBottomSheet).mockImplementation(() => ({
    start: callback => {
      if (callback) exits.push(callback);
    },
    stop: jest.fn(),
    reset: jest.fn(),
  }));
});
afterEach(() => {
  renderer.act(() => screen?.unmount());
  screen = undefined as unknown as renderer.ReactTestRenderer;
  jest.restoreAllMocks();
});
async function show(subject: GradeBookSubject | null) {
  await renderer.act(async () => {
    const element = (
      <GradePicker
        subject={subject}
        saving={false}
        pending={null}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );
    if (screen) screen.update(element);
    else screen = renderer.create(element);
  });
}
it('keeps the sheet content through its closing motion and prevents a second grade selection', async () => {
  await show(first);
  await show(null);
  expect(screen.root.findByType(Modal).props.visible).toBe(true);
  expect(
    screen.root
      .findAllByType(Pressable)
      .find(node => node.props.accessibilityLabel === 'Set grade 1.00')!.props
      .disabled,
  ).toBe(true);
  renderer.act(() => exits[0]({finished: true}));
  expect(screen.root.findByType(Modal).props.visible).toBe(false);
});
it('does not let an interrupted closing animation hide a newly opened subject', async () => {
  await show(first);
  await show(null);
  const oldExit = exits[0];
  await show(second);
  renderer.act(() => oldExit({finished: true}));
  expect(screen.root.findByType(Modal).props.visible).toBe(true);
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'MAT101'),
  ).toBe(true);
});
it('skips both transitions when Reduce Motion is enabled', async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
  await show(first);
  await show(null);
  expect(exitBottomSheet).not.toHaveBeenCalled();
  expect(screen.root.findByType(Modal).props.visible).toBe(false);
});

jest.mock('@react-navigation/native', () => ({NavigationContext: require('react').createContext(undefined)}));
