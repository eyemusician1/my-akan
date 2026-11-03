import {beforeEach, afterEach, it, expect, jest} from '@jest/globals';
import notifee from '@notifee/react-native';
import {NotificationService} from '../src/core/notifications/NotificationService';
import type Subject from '../src/core/database/models/Subject';
import {Platform} from 'react-native';
import {notificationPreferences} from '../src/core/notifications/preferences';

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn(async () => ({authorizationStatus: 1})),
    cancelAllNotifications: jest.fn(),
    createChannel: jest.fn(),
    createTriggerNotification: jest.fn(),
    getTriggerNotificationIds: jest.fn(async () => ['removed-Mon']),
    getDisplayedNotifications: jest.fn(async () => [
      {notification: {id: 'budget-weekly-123-1'}},
    ]),
  },
  TriggerType: {TIMESTAMP: 0},
  RepeatFrequency: {WEEKLY: 2},
  AuthorizationStatus: {DENIED: 0, AUTHORIZED: 1},
  AlarmType: {SET_AND_ALLOW_WHILE_IDLE: 1, SET_EXACT_AND_ALLOW_WHILE_IDLE: 3},
  AndroidNotificationSetting: {DISABLED: 0, ENABLED: 1},
  AndroidImportance: {HIGH: 4},
  AndroidStyle: {BIGTEXT: 1},
}));
jest.mock('../src/core/notifications/preferences', () => ({
  notificationPreferences: {
    load: jest.fn(async () => ({classes: true, budgets: true})),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(notifee.createTriggerNotification).mockResolvedValue('reminder');
  jest
    .mocked(notificationPreferences.load)
    .mockResolvedValue({classes: true, budgets: true});
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 10, 2, 8, 0));
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('clears only class alarms when reminders are disabled', async () => {
  jest
    .mocked(notificationPreferences.load)
    .mockResolvedValue({classes: false, budgets: true});
  jest
    .mocked(notifee.getTriggerNotificationIds)
    .mockResolvedValueOnce(['class-old-Mon', 'budget-daily-123-1']);
  await NotificationService.syncScheduleAlarms([
    {id: 'new', days: ['Mon'], startTime: '09:00 AM'} as Subject,
  ]);
  expect(notifee.cancelAllNotifications).toHaveBeenCalledWith([
    'class-old-Mon',
  ]);
  expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
  expect(notifee.requestPermission).not.toHaveBeenCalled();
});

it('uses an idle-safe alarm and falls back when exact-alarm access is unavailable', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest
    .mocked(notifee.requestPermission)
    .mockResolvedValueOnce({
      authorizationStatus: 1,
      android: {alarm: 0},
    } as never);
  await NotificationService.syncScheduleAlarms([
    {
      id: 'csc',
      code: 'CSC101',
      days: ['Mon'],
      startTime: '09:00 AM',
    } as Subject,
  ]);
  expect(notifee.createTriggerNotification).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({alarmManager: {type: 1}}),
  );
});

it('handles reminders that fall on the previous calendar day and removes duplicate days', async () => {
  jest.setSystemTime(new Date(2026, 10, 8, 23));
  await NotificationService.syncScheduleAlarms([
    {
      id: 'midnight',
      code: 'CSC101',
      days: ['Mon', 'Mon'],
      startTime: '12:05 AM',
    } as Subject,
  ]);
  expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
  expect(notifee.createTriggerNotification).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      timestamp: new Date(2026, 10, 8, 23, 50).getTime(),
    }),
  );
});

it('formats expanded notification details on separate lines and keeps titles literal', async () => {
  await NotificationService.syncScheduleAlarms([
    {
      id: 'csc',
      code: 'CSC101',
      title: 'Computing & <Networks>',
      days: ['Mon'],
      startTime: '09:00 AM',
      endTime: '10:30 AM',
      room: '301',
    } as Subject,
  ]);
  expect(notifee.createTriggerNotification).toHaveBeenCalledWith(
    expect.objectContaining({
      android: expect.objectContaining({
        style: expect.objectContaining({
          text: 'Computing &amp; &lt;Networks&gt;<br/>09:00 AM – 10:30 AM · 301',
        }),
      }),
    }),
    expect.anything(),
  );
});

it('clears removed classes without requesting notification permission for an empty schedule', async () => {
  await NotificationService.syncScheduleAlarms([]);
  expect(notifee.cancelAllNotifications).toHaveBeenCalledWith(['removed-Mon']);
  expect(notifee.requestPermission).not.toHaveBeenCalled();
  expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
});

it('reports denied permission after clearing obsolete alarms', async () => {
  jest.mocked(notifee.requestPermission).mockResolvedValueOnce({
    authorizationStatus: 0,
  } as Awaited<ReturnType<typeof notifee.requestPermission>>);
  await expect(
    NotificationService.syncScheduleAlarms([
      {id: 'csc', days: ['Mon'], startTime: '09:00 AM'} as Subject,
    ]),
  ).rejects.toThrow('Notification permission was denied');
  expect(notifee.cancelAllNotifications).toHaveBeenCalledTimes(1);
  expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
});

it('schedules weekly alerts 15 minutes before class and skips TBA times', async () => {
  const subject = {
    id: 'csc',
    code: 'CSC101',
    title: 'Computing',
    room: '301',
    days: ['Mon'],
    startTime: '09:00 AM',
  } as Subject;
  await NotificationService.syncScheduleAlarms([
    subject,
    {...subject, id: 'tba', startTime: ''} as Subject,
  ]);
  expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
  expect(notifee.createTriggerNotification).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 'class-csc-Mon',
      title: 'CSC101 · in 15 min',
      body: 'Computing\n09:00 AM · 301',
      data: {target: 'schedule'},
    }),
    expect.objectContaining({
      timestamp: new Date(2026, 10, 2, 8, 45).getTime(),
      repeatFrequency: 2,
    }),
  );
});

it('refreshes alerts in bounded batches instead of one native call at a time', async () => {
  const release: Array<() => void> = [];
  let active = 0,
    peak = 0;
  jest.mocked(notifee.createTriggerNotification).mockImplementation(
    () =>
      new Promise<string>(resolve => {
        active++;
        peak = Math.max(peak, active);
        release.push(() => {
          active--;
          resolve('notification');
        });
      }),
  );
  const refresh = NotificationService.syncScheduleAlarms([
    {
      id: 'course',
      code: 'CSC101',
      title: 'Computing',
      room: '305',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      startTime: '09:00 AM',
    } as Subject,
  ]);
  for (let i = 0; i < 30; i++) await Promise.resolve();
  expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(4);
  release.slice(0, 4).forEach(resolve => resolve());
  for (let i = 0; i < 10; i++) await Promise.resolve();
  expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(5);
  release[4]();
  await refresh;
  expect(peak).toBe(4);
});
