import React from 'react';
import {afterEach, expect, it, jest} from '@jest/globals';
import {Pressable, Text} from 'react-native';
import renderer from 'react-test-renderer';
import {ArchiveContent} from '../src/features/schedule/components/ArchiveOverview';
import type {SavedSchedule} from '../src/features/schedule/data/archive';

jest.mock('../src/core/database', () => ({database: {}}));
jest.mock(
  '@nozbe/with-observables',
  () => () => (component: unknown) => component,
);
jest.mock('@react-navigation/native', () => ({useFocusEffect: () => {}}));
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcon');
let screen: renderer.ReactTestRenderer;
afterEach(() => {
  renderer.act(() => screen?.unmount());
});
const entry: SavedSchedule = {
  id: 'saved-first',
  academicTerm: '1st Sem',
  createdAt: new Date(),
  subjectCount: 6,
  totalUnits: 18,
  current: true,
};
it('shows the current schedule even when it is the only one, and opens its own record', () => {
  const open = jest.fn();
  renderer.act(() => {
    screen = renderer.create(
      <ArchiveContent entries={[entry]} onOpenSchedule={open} />,
    );
  });
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Current'),
  ).toBe(true);
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Previous'),
  ).toBe(false);
  renderer.act(() => screen.root.findByType(Pressable).props.onPress());
  expect(open).toHaveBeenCalledWith('saved-first');
});
it('keeps previous semester cards connected to the selected saved details', () => {
  const open = jest.fn();
  renderer.act(() => {
    screen = renderer.create(
      <ArchiveContent
        entries={[
          {...entry, id: 'second', academicTerm: '2nd Sem'},
          {...entry, current: false},
        ]}
        onOpenSchedule={open}
      />,
    );
  });
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Previous'),
  ).toBe(true);
  renderer.act(() => screen.root.findAllByType(Pressable)[1].props.onPress());
  expect(open).toHaveBeenCalledWith('saved-first');
  renderer.act(() =>
    screen.update(<ArchiveContent entries={[]} onOpenSchedule={open} />),
  );
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'No saved schedules'),
  ).toBe(true);
});
