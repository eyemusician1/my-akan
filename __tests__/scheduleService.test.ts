import {beforeEach, it, expect, jest} from '@jest/globals';
import {scheduleRepository} from '../src/features/schedule/data';
import {
  scheduleService,
  refreshScheduleIntegrations,
} from '../src/features/schedule/services/scheduleService';
import {NotificationService} from '../src/core/notifications/NotificationService';
import {syncScheduleToWidget} from '../src/core/widgets/widgetSync';
import {SaveSubjectInput} from '../src/features/schedule/domain/types';

jest.mock('../src/features/schedule/data', () => ({
  scheduleRepository: {
    getLatestSchedule: jest.fn(),
    saveSubject: jest.fn(),
    deleteSubject: jest.fn(),
    deleteSchedule: jest.fn(),
  },
}));
jest.mock('../src/core/notifications/NotificationService', () => ({
  NotificationService: {syncScheduleAlarms: jest.fn()},
}));
jest.mock('../src/core/widgets/widgetSync', () => ({
  syncScheduleToWidget: jest.fn(),
}));

const repository = jest.mocked(scheduleRepository);
const alarms = jest.mocked(NotificationService.syncScheduleAlarms);
const widget = jest.mocked(syncScheduleToWidget);
const input: SaveSubjectInput = {
  academicTerm: '1st Sem',
  subject: {
    code: 'CSC101',
    title: 'Computing',
    section: '',
    units: 3,
    days: [],
    startTime: '',
    endTime: '',
    room: '',
    instructor: '',
  },
};

beforeEach(() => {
  jest.resetAllMocks();
  repository.getLatestSchedule.mockResolvedValue(undefined);
  alarms.mockResolvedValue(undefined);
  widget.mockResolvedValue(undefined);
});

it('does not refresh native integrations or report success when persistence fails', async () => {
  repository.saveSubject.mockRejectedValue(new Error('Disk full'));
  await expect(scheduleService.saveSubject(input)).rejects.toThrow('Disk full');
  expect(alarms).not.toHaveBeenCalled();
  expect(widget).not.toHaveBeenCalled();
});

it('returns a separate warning when reminders fail after a successful save', async () => {
  alarms.mockRejectedValue(new Error('Permission denied'));
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const result = await scheduleService.saveSubject(input);
    expect(repository.saveSubject).toHaveBeenCalledWith(input);
    expect(result.syncIssues).toEqual(['reminders']);
    expect(widget).toHaveBeenCalledTimes(1);
  } finally {
    warning.mockRestore();
  }
});

it('clears alarms and refreshes the widget when the last schedule is deleted', async () => {
  await scheduleService.deleteSchedule('schedule-id');
  expect(repository.deleteSchedule).toHaveBeenCalledWith('schedule-id');
  expect(alarms).toHaveBeenCalledWith([]);
  expect(widget).toHaveBeenCalledTimes(1);
});

it('refreshes both integrations after a subject deletion', async () => {
  await scheduleService.deleteSubject('subject-id');
  expect(repository.deleteSubject).toHaveBeenCalledWith('subject-id');
  expect(alarms).toHaveBeenCalledTimes(1);
  expect(widget).toHaveBeenCalledTimes(1);
});

it('serializes refreshes so an older snapshot cannot finish after a newer one', async () => {
  let release!: () => void;
  alarms.mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        release = resolve;
      }),
  );
  const first = refreshScheduleIntegrations();
  // Allow repository reads and the first alarm refresh to start.
  await Promise.resolve();
  await Promise.resolve();
  const second = refreshScheduleIntegrations();
  await Promise.resolve();
  expect(alarms).toHaveBeenCalledTimes(1);
  release();
  await Promise.all([first, second]);
  expect(alarms).toHaveBeenCalledTimes(2);
});
