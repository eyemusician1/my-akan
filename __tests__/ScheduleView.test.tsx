import React from 'react';
import {afterEach, expect, it, jest} from '@jest/globals';
import {Text, TouchableOpacity} from 'react-native';
import renderer from 'react-test-renderer';
import {ScheduleViewUI} from '../src/features/schedule/components/ScheduleView';
import type Subject from '../src/core/database/models/Subject';

jest.mock('../src/core/database', () => ({database: {}}));
jest.mock('../src/features/schedule/services/scheduleService', () => ({
  scheduleService: {},
}));
jest.mock(
  '@nozbe/with-observables',
  () => () => (component: unknown) => component,
);
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({}),
  useFocusEffect: () => {},
}));
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcon');

let screen: renderer.ReactTestRenderer;
afterEach(() => {
  renderer.act(() => screen?.unmount());
  jest.useRealTimers();
});

function subject(id: string, title: string, days: string[]) {
  return {
    id,
    code: id,
    title,
    days,
    startTime: '08:00 AM',
    endTime: '12:00 PM',
    room: 'Campus',
  } as Subject;
}
function visibleText() {
  return screen.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .join(' ');
}

it('shows Sunday ROTC in the agenda and Sunday CWTS in the weekly timetable', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 10, 1, 9)); // Sunday, local time.
  renderer.act(() => {
    screen = renderer.create(
      <ScheduleViewUI
        subjects={[
          subject('NSTP1', 'ROTC', ['Sun']),
          subject('NSTP2', 'CWTS', ['Sun']),
          subject('CSC101', 'Computing', ['Mon', 'Wed']),
        ]}
      />,
    );
  });
  expect(visibleText()).toContain('ROTC');
  expect(visibleText()).toContain('CWTS');
  expect(visibleText()).not.toContain('Computing');
  expect(visibleText()).not.toContain('No classes today');
  renderer.act(() => {
    screen.root
      .findAllByType(TouchableOpacity)
      .find(node => node.props.accessibilityLabel === 'Week view')!
      .props.onPress();
  });
  expect(visibleText()).toContain('Sun');
  expect(visibleText()).toContain('NSTP1');
  expect(visibleText()).toContain('NSTP2');
  expect(visibleText()).toContain('CSC101');
});
