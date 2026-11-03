import React from 'react';
import {afterEach, expect, it, jest} from '@jest/globals';
import {
  Pressable,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import renderer from 'react-test-renderer';
import {HomeScreen} from '../src/screens/HomeScreen';
import {GradeCalculatorScreen} from '../src/screens/GradeCalculatorScreen';
import {GradeBook} from '../src/features/grades/components/GradeBook';
import {GradeCalculator} from '../src/features/grades/components/GradeCalculator';
import {ArchiveOverview} from '../src/features/schedule/components/ArchiveOverview';
import type {AppScreenProps} from '../src/navigation/types';

jest.mock('../src/core/database', () => ({database: {}}));
jest.mock('../src/features/schedule/data', () => ({scheduleRepository: {}}));
jest.mock('../src/features/schedule/services/scheduleService', () => ({
  refreshScheduleIntegrations: jest.fn(),
}));
jest.mock(
  '@nozbe/with-observables',
  () => () => (component: unknown) => component,
);
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({}),
  useFocusEffect: () => {},
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {getItem: jest.fn()},
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0}),
}));
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcon');
jest.mock('../src/features/schedule/components/RecentOverview', () => ({
  RecentOverview: () => null,
}));
jest.mock('../src/features/schedule/components/ArchiveOverview', () => ({
  ArchiveOverview: jest.fn(() => null),
}));
jest.mock('../src/features/schedule/components/ScheduleView', () => ({
  ScheduleView: () => null,
}));
jest.mock('../src/features/grades/components/GradeBook', () => ({
  GradeBook: jest.fn(() => null),
}));
jest.mock('../src/features/grades/components/GradeCalculator', () => ({
  GradeCalculator: jest.fn(() => null),
}));
jest.mock('../src/screens/CampusMapModal', () => ({
  CampusMapModal: () => null,
  locateBuildingByRoom: () => null,
}));

let screen: renderer.ReactTestRenderer;
afterEach(() => {
  renderer.act(() => screen?.unmount());
  jest.clearAllMocks();
});
it('connects the Grades tab and + shortcut to semester calculation', () => {
  const navigate = jest.fn();
  renderer.act(() => {
    screen = renderer.create(
      <HomeScreen
        route={{key: 'home', name: 'Home', params: undefined}}
        navigation={
          {navigate} as unknown as AppScreenProps<'Home'>['navigation']
        }
      />,
    );
  });
  // The floating menu's empty area must let taps reach subject rows underneath.
  expect(
    screen.root.findAllByProps({testID: 'home-fab-layer'})[0].props
      .pointerEvents,
  ).toBe('box-none');
  renderer.act(() =>
    screen.root
      .findAllByType(Pressable)
      .find(node =>
        node.findAllByType(Text).some(text => text.props.children === 'Grades'),
      )!
      .props.onPress(),
  );
  renderer.act(() =>
    screen.root.findByType(GradeBook).props.onCalculate('term-id'),
  );
  expect(navigate).toHaveBeenCalledWith('GradeCalculator', {
    scheduleId: 'term-id',
    autoCalculate: true,
  });
  renderer.act(() =>
    screen.root.findByType(TouchableWithoutFeedback).props.onPress(),
  );
  expect(
    screen.root.findByType(TouchableWithoutFeedback).props.accessibilityState
      .expanded,
  ).toBe(true);
  renderer.act(() =>
    screen.root
      .findAllByType(TouchableOpacity)
      .find(node =>
        node
          .findAllByType(Text)
          .some(text => text.props.children === 'GPA calculator'),
      )!
      .props.onPress(),
  );
  expect(navigate).toHaveBeenCalledWith('GradeCalculator');
  expect(
    screen.root.findByType(TouchableWithoutFeedback).props.accessibilityState
      .expanded,
  ).toBe(false);
});
it('opens the chosen semester and returns to its grade log', () => {
  const popTo = jest.fn();
  renderer.act(() => {
    screen = renderer.create(
      <GradeCalculatorScreen
        route={{
          key: 'calculator',
          name: 'GradeCalculator',
          params: {scheduleId: 'term-id', autoCalculate: true},
        }}
        navigation={
          {popTo} as unknown as AppScreenProps<'GradeCalculator'>['navigation']
        }
      />,
    );
  });
  expect(screen.root.findByType(GradeCalculator).props).toMatchObject({
    initialScheduleId: 'term-id',
    autoCalculate: true,
  });
  renderer.act(() =>
    screen.root.findByType(GradeCalculator).props.onLogGrades('term-id'),
  );
  expect(popTo).toHaveBeenCalledWith('Home', {
    tab: 'Grades',
    gradeScheduleId: 'term-id',
  });
});

it('connects Archive to the selected saved schedule instead of the latest one', () => {
  const navigate = jest.fn();
  renderer.act(() => {
    screen = renderer.create(
      <HomeScreen
        route={{key: 'home', name: 'Home', params: undefined}}
        navigation={
          {navigate} as unknown as AppScreenProps<'Home'>['navigation']
        }
      />,
    );
  });
  renderer.act(() =>
    screen.root
      .findAllByType(Pressable)
      .find(node =>
        node
          .findAllByType(Text)
          .some(label => label.props.children === 'Archive'),
      )!
      .props.onPress(),
  );
  renderer.act(() =>
    screen.root
      .findByType(ArchiveOverview)
      .props.onOpenSchedule('previous-term'),
  );
  expect(navigate).toHaveBeenCalledWith('RecentSchedules', {
    scheduleId: 'previous-term',
  });
});
