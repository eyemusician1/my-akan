import React from 'react';
import {afterEach, beforeEach, expect, it, jest} from '@jest/globals';
import {Pressable, Text} from 'react-native';
import renderer from 'react-test-renderer';
import {RecentContent} from '../src/features/schedule/components/RecentOverview';
import type Schedule from '../src/core/database/models/Schedule';
import type Subject from '../src/core/database/models/Subject';
import type ScheduleActivity from '../src/core/database/models/ScheduleActivity';

jest.mock('../src/core/database', () => ({database: {}}));
jest.mock(
  '@nozbe/with-observables',
  () => () => (component: unknown) => component,
);
jest.mock('@react-navigation/native', () => ({useFocusEffect: () => {}}));
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcon');

let screen: renderer.ReactTestRenderer;
const openSchedule = jest.fn(),
  openSubject = jest.fn();
const now = new Date(2026, 10, 2, 9);
const schedule = {
  id: 'term',
  academicTerm: '1st Sem',
  createdAt: new Date(+now - 86400000),
} as Schedule;
const subject = {
  id: 'one',
  code: 'CSC101',
  title: 'Computing',
  units: 3,
  days: ['Mon'],
  startTime: '10:00 AM',
  endTime: '11:00 AM',
  room: '305',
  createdAt: schedule.createdAt,
} as Subject;
function render(updated = schedule, activities: ScheduleActivity[] = []) {
  const element = (
    <RecentContent
      schedule={updated}
      subjects={[subject]}
      activities={activities}
      onOpenSchedule={openSchedule}
      onOpenSubject={openSubject}
    />
  );
  renderer.act(() => {
    if (screen) screen.update(element);
    else screen = renderer.create(element);
  });
}
function text() {
  return screen.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .join(' ')
    .replace(/\s+/g, ' ');
}
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(now);
  jest.clearAllMocks();
});
afterEach(() => {
  renderer.act(() => screen?.unmount());
  screen = undefined as unknown as renderer.ReactTestRenderer;
  jest.useRealTimers();
});

it('keeps schedule access and live updates without the summary card', () => {
  render();
  expect(text()).toContain('Added 1 day ago');
  expect(text()).toContain('UP NEXT');
  expect(text()).not.toContain('Subjects');
  expect(text()).not.toContain('Units');
  expect(text()).not.toContain('1st Sem');
  render({...schedule, updatedAt: now} as Schedule, [
    {
      id: 'edit',
      kind: 'updated',
      label: 'CSC101 updated',
      detail: 'Room',
      createdAt: now,
    } as ScheduleActivity,
  ]);
  expect(text()).toContain('Updated just now');
  expect(text()).toContain('CSC101 updated');
  expect(text()).toContain('Room');
  const activityToggle = () =>
    screen.root
      .findAllByType(Pressable)
      .find(node => node.props.accessibilityLabel === 'Activity')!;
  renderer.act(() => activityToggle().props.onPress());
  expect(activityToggle().props.accessibilityState.expanded).toBe(false);
  expect(text()).not.toContain('CSC101 updated');
  expect(text()).toContain('UP NEXT');
  render({...schedule, updatedAt: now} as Schedule, [
    {
      id: 'new-edit',
      kind: 'updated',
      label: 'CSC101 updated',
      detail: 'Time',
      createdAt: now,
    } as ScheduleActivity,
  ]);
  expect(activityToggle().props.accessibilityState.expanded).toBe(false);
  renderer.act(() => activityToggle().props.onPress());
  expect(activityToggle().props.accessibilityState.expanded).toBe(true);
  expect(text()).toContain('CSC101 updated');
  expect(text()).toContain('Time');
  renderer.act(() =>
    screen.root
      .findAllByType(Pressable)
      .find(node => node.props.accessibilityLabel === 'View schedule')!
      .props.onPress(),
  );
  expect(openSchedule).toHaveBeenCalledWith('term');
  renderer.act(() =>
    screen.root
      .findAllByType(Pressable)
      .find(node => node.props.accessibilityLabel === 'Open CSC101')!
      .props.onPress(),
  );
  expect(openSubject).toHaveBeenCalledWith('one');
});
