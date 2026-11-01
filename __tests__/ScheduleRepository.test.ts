import {beforeEach, it, expect, jest} from '@jest/globals';
import {Database} from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import {schema} from '../src/core/database/schema';
import Schedule from '../src/core/database/models/Schedule';
import Subject from '../src/core/database/models/Subject';
import Expense from '../src/core/database/models/Expense';
import Due from '../src/core/database/models/Due';
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
    modelClasses: [Schedule, Subject, Expense, Due],
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
});
