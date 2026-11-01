import {beforeEach, afterEach, it, expect, jest} from '@jest/globals';
import notifee from '@notifee/react-native';
import {NotificationService} from '../src/core/notifications/NotificationService';
import type Subject from '../src/core/database/models/Subject';

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn(async () => ({authorizationStatus: 1})),
    cancelAllNotifications: jest.fn(),
    createChannel: jest.fn(),
    createTriggerNotification: jest.fn(),
  },
  TriggerType: {TIMESTAMP: 0},
  RepeatFrequency: {WEEKLY: 2},
  AuthorizationStatus: {DENIED: 0, AUTHORIZED: 1},
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 10, 2, 8, 0));
});
afterEach(() => {
  jest.useRealTimers();
});

it('clears removed classes without requesting notification permission for an empty schedule', async () => {
  await NotificationService.syncScheduleAlarms([]);
  expect(notifee.cancelAllNotifications).toHaveBeenCalledTimes(1);
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
    expect.objectContaining({id: 'csc-Mon'}),
    expect.objectContaining({
      timestamp: new Date(2026, 10, 2, 8, 45).getTime(),
      repeatFrequency: 2,
    }),
  );
});
