import {beforeEach, it, expect, jest} from '@jest/globals';
import {Database} from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import {schema} from '../src/core/database/schema';
import Schedule from '../src/core/database/models/Schedule';
import Subject from '../src/core/database/models/Subject';
import Expense from '../src/core/database/models/Expense';
import Due from '../src/core/database/models/Due';
import ScheduleActivity from '../src/core/database/models/ScheduleActivity';
import {ScheduleRepository} from '../src/features/schedule/data/ScheduleRepository';
import {SaveSubjectInput} from '../src/features/schedule/domain/types';

let database: Database;
let repository: ScheduleRepository;
const input: SaveSubjectInput = {
  academicTerm: '1st Sem',
  declaredUnits: 6,
  subject: {
    code: 'CSC101',
    section: '',
    title: 'Computing',
    units: 3,
    room: '',
    instructor: '',
    days: ['Mon'],
    startTime: '08:00 AM',
    endTime: '09:00 AM',
  },
};

beforeEach(() => {
  database = new Database({
    adapter: new LokiJSAdapter({
      schema,
      useWebWorker: false,
      useIncrementalIndexedDB: true,
      extraLokiOptions: {autosave: false},
    }),
    modelClasses: [Schedule, Subject, Expense, Due, ScheduleActivity],
  });
  repository = new ScheduleRepository(database);
});

it('creates related records and updates an existing subject without duplication', async () => {
  const subject = await repository.saveSubject(input);
  const schedule = await subject.schedule.fetch();
  expect(schedule.academicTerm).toBe('1st Sem');
  expect(await schedule.subjects.fetchCount()).toBe(1);
  await repository.saveSubject({
    ...input,
    subjectId: subject.id,
    subject: {...input.subject, title: 'Updated'},
  });
  expect(subject.title).toBe('Updated');
  expect(await repository.getTermSummary('1st Sem')).toEqual({
    declaredUnits: 6,
    subjectCount: 1,
    totalUnits: 3,
  });
});

it('rejects conflicts without creating records and accepts adjacent classes', async () => {
  await repository.saveSubject(input);
  await expect(repository.saveSubject(input)).rejects.toThrow(
    'overlaps with CSC101',
  );
  await repository.saveSubject({
    ...input,
    subject: {
      ...input.subject,
      code: 'CSC102',
      startTime: '09:00 AM',
      endTime: '10:00 AM',
    },
  });
  expect((await repository.getTermSummary('1st Sem')).subjectCount).toBe(2);
});

it('checks persisted totals when concurrent saves reach the declared limit', async () => {
  const tba = {
    ...input,
    subject: {...input.subject, days: [], startTime: '', endTime: ''},
  };
  const results = await Promise.allSettled([
    repository.saveSubject(tba),
    repository.saveSubject(tba),
    repository.saveSubject(tba),
  ]);
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(
    2,
  );
  expect((await repository.getTermSummary('1st Sem')).totalUnits).toBe(6);
});

it('removes the empty source term when moving its last subject to another term', async () => {
  const subject = await repository.saveSubject(input);
  await repository.saveSubject({
    ...input,
    academicTerm: '2nd Sem',
    subjectId: subject.id,
  });
  expect(await repository.getScheduleForTerm('1st Sem')).toBeUndefined();
  expect((await subject.schedule.fetch()).academicTerm).toBe('2nd Sem');
});

it('deletes a subject and removes its parent only when the parent becomes empty', async () => {
  const one = await repository.saveSubject(input);
  const two = await repository.saveSubject({
    ...input,
    subject: {...input.subject, days: ['Tue']},
  });
  await repository.deleteSubject(one.id);
  expect((await repository.getTermSummary('1st Sem')).subjectCount).toBe(1);
  await repository.deleteSubject(two.id);
  expect(await repository.getLatestSchedule()).toBeUndefined();
});

it('fetches the current children before cascading a schedule deletion', async () => {
  const subject = await repository.saveSubject(input);
  const schedule = await subject.schedule.fetch();
  await repository.saveSubject({
    ...input,
    subject: {...input.subject, days: ['Tue']},
  });
  await repository.deleteSchedule(schedule.id);
  expect(await database.get<Subject>('subjects').query().fetchCount()).toBe(0);
  expect(await repository.getLatestSchedule()).toBeUndefined();
});

it('propagates database failures so the UI cannot report a successful save', async () => {
  const batch = jest
    .spyOn(database, 'batch')
    .mockRejectedValueOnce(new Error('Disk full'));
  await expect(repository.saveSubject(input)).rejects.toThrow('Disk full');
  batch.mockRestore();
  expect(
    await database
      .get<ScheduleActivity>('schedule_activities')
      .query()
      .fetchCount(),
  ).toBe(0);
});

it('persists an edit timestamp and its activity in the same mutation', async () => {
  const subject = await repository.saveSubject(input);
  const schedule = await subject.schedule.fetch();
  const created = schedule.createdAt.getTime();
  const clock = jest.spyOn(Date, 'now').mockReturnValue(created + 120000);
  try {
    await repository.saveSubject({
      ...input,
      subjectId: subject.id,
      subject: {...input.subject, room: '305'},
    });
    expect(schedule.updatedAt?.getTime()).toBe(created + 120000);
    expect(schedule.createdAt.getTime()).toBe(created);
    const history = await database
      .get<ScheduleActivity>('schedule_activities')
      .query()
      .fetch();
    expect(history.map(event => event.kind)).toEqual(['added', 'updated']);
    expect(history[1]).toMatchObject({
      label: 'CSC101 updated',
      detail: 'Room',
      subjectId: subject.id,
    });
    // A new repository instance reads the persisted modification date.
    expect(
      (
        await new ScheduleRepository(database).getLatestSchedule()
      )?.updatedAt?.getTime(),
    ).toBe(created + 120000);
  } finally {
    clock.mockRestore();
  }
});

it('does not manufacture recent activity or a new timestamp for an unchanged save', async () => {
  const subject = await repository.saveSubject(input);
  const schedule = await subject.schedule.fetch();
  const originalDate = schedule.updatedAt?.getTime();
  await repository.saveSubject({...input, subjectId: subject.id});
  expect(schedule.updatedAt?.getTime()).toBe(originalDate);
  expect(
    await database
      .get<ScheduleActivity>('schedule_activities')
      .query()
      .fetchCount(),
  ).toBe(1);
});

it('updates Recent when a subject is removed and retains the removal after the last subject', async () => {
  const first = await repository.saveSubject(input);
  const second = await repository.saveSubject({
    ...input,
    subject: {...input.subject, code: 'CSC102', days: ['Tue']},
  });
  const schedule = await first.schedule.fetch();
  const updated = (schedule.updatedAt?.getTime() ?? 0) + 120000;
  const clock = jest.spyOn(Date, 'now').mockReturnValue(updated);
  try {
    await repository.deleteSubject(first.id);
    expect(schedule.updatedAt?.getTime()).toBe(updated);
    await repository.deleteSubject(second.id);
    expect(await repository.getLatestSchedule()).toBeUndefined();
    const history = await database
      .get<ScheduleActivity>('schedule_activities')
      .query()
      .fetch();
    expect(
      history
        .filter(event => event.kind === 'removed')
        .map(event => event.label),
    ).toEqual(['CSC101 removed', 'CSC102 removed']);
  } finally {
    clock.mockRestore();
  }
});
