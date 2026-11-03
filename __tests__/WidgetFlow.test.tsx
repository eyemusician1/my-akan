import React from 'react';
import {afterEach, beforeEach, expect, it, jest} from '@jest/globals';
import {Platform} from 'react-native';
import renderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestWidgetUpdate,
  WidgetTaskHandlerProps,
} from 'react-native-android-widget';
import {ScheduleWidget} from '../src/widgets/ScheduleWidget';
import {widgetTaskHandler} from '../src/widgets/WidgetTaskHandler';
import {
  loadWidgetSchedule,
  syncScheduleToWidget,
} from '../src/core/widgets/widgetSync';
import {
  ADD_SCHEDULE_URI,
  SCHEDULE_URI,
  makeWidgetSchedule,
  WIDGET_CACHE_KEY,
} from '../src/widgets/scheduleData';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-android-widget', () => ({
  FlexWidget: 'FlexWidget',
  TextWidget: 'TextWidget',
  ListWidget: 'ListWidget',
  requestWidgetUpdate: jest.fn(),
}));
jest.mock('../src/core/database', () => ({
  database: {
    get: () => ({
      query: () => ({fetch: () => mockFetch()}),
    }),
  },
}));
const mockFetch = jest.fn<() => Promise<unknown[]>>();
const course = {
  id: '1',
  code: 'M101',
  title: 'Mathematics',
  days: ['Mon'],
  room: '201',
  startTime: '08:00 AM',
  endTime: '09:00 AM',
};
const renderWidget =
  jest.fn<
    (
      widget: React.ReactElement<React.ComponentProps<typeof ScheduleWidget>>,
    ) => void
  >();
const task = (widgetAction: WidgetTaskHandlerProps['widgetAction']) =>
  ({
    widgetAction,
    renderWidget,
    widgetInfo: {height: 160, width: 160},
  } as unknown as WidgetTaskHandlerProps);
beforeEach(async () => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'android');
  await AsyncStorage.clear();
  mockFetch.mockResolvedValue([{subjects: {fetch: async () => [course]}}]);
});
afterEach(() => {
  jest.restoreAllMocks();
});
it('caches the full roster and immediately refreshes installed widgets after an edit or deletion', async () => {
  await syncScheduleToWidget();
  expect(
    JSON.parse((await AsyncStorage.getItem(WIDGET_CACHE_KEY))!).subjects[0]
      .days,
  ).toEqual(['Mon']);
  expect(requestWidgetUpdate).toHaveBeenCalledWith(
    expect.objectContaining({widgetName: 'RNWidgetProvider'}),
  );
  mockFetch.mockResolvedValue([]);
  await syncScheduleToWidget();
  expect(
    JSON.parse((await AsyncStorage.getItem(WIDGET_CACHE_KEY))!).subjects,
  ).toEqual([]);
});
it('recovers an old cache from persisted classes when first added, then reads offline on resize/update', async () => {
  await AsyncStorage.setItem(WIDGET_CACHE_KEY, '[{"code":"OLD"}]');
  await widgetTaskHandler(task('WIDGET_ADDED'));
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(renderWidget.mock.calls[0][0].props.schedule.subjects[0].code).toBe(
    'M101',
  );
  await widgetTaskHandler(task('WIDGET_UPDATE'));
  await widgetTaskHandler(task('WIDGET_RESIZED'));
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(renderWidget.mock.calls[2][0].props.height).toBe(160);
  await widgetTaskHandler(task('WIDGET_DELETED'));
  expect(renderWidget).toHaveBeenCalledTimes(3);
});
it('renders every class in a scrollable list and uses separate direct links for add and view', () => {
  const schedule = makeWidgetSchedule(
    Array.from({length: 6}, (_, i) => ({
      ...course,
      id: String(i),
      code: `CS10${i}`,
    })),
  );
  const screen = renderer.create(
    <ScheduleWidget
      schedule={schedule}
      now={new Date(2026, 10, 2)}
      height={160}
    />,
  );
  const buttons = screen.root.findAll(node => !!node.props.clickAction);
  expect(
    buttons.find(node => node.props.accessibilityLabel === 'Add subject')!.props
      .clickActionData.uri,
  ).toBe(ADD_SCHEDULE_URI);
  expect(
    buttons.filter(node => node.props.clickActionData.uri === SCHEDULE_URI),
  ).toHaveLength(7);
  expect(
    screen.root.findAll(node => node.type === ('ListWidget' as unknown)),
  ).toHaveLength(1);
  expect(
    screen.root.findAll(
      node =>
        typeof node.props.text === 'string' && /^CS10/.test(node.props.text),
    ),
  ).toHaveLength(6);
  screen.unmount();
});
it('can hydrate an empty database without retaining previous classes', async () => {
  mockFetch.mockResolvedValue([]);
  expect(await loadWidgetSchedule()).toEqual({version: 2, subjects: []});
});
it('offers refresh when storage is unavailable, then recovers on the next update', async () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockFetch.mockRejectedValueOnce(new Error('Storage unavailable'));
  await widgetTaskHandler(task('WIDGET_UPDATE'));
  expect(renderWidget.mock.calls[0][0].props.unavailable).toBe(true);
  expect(warning).toHaveBeenCalled();
  await widgetTaskHandler(task('WIDGET_UPDATE'));
  expect(renderWidget.mock.calls[1][0].props.unavailable).toBe(false);
  expect(renderWidget.mock.calls[1][0].props.schedule.subjects[0].code).toBe(
    'M101',
  );
});
