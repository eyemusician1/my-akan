import {beforeEach, expect, it, jest} from '@jest/globals';
import {Database} from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import {schema} from '../src/core/database/schema';
import Schedule from '../src/core/database/models/Schedule';
import Subject from '../src/core/database/models/Subject';
import Expense from '../src/core/database/models/Expense';
import Due from '../src/core/database/models/Due';
import ScheduleActivity from '../src/core/database/models/ScheduleActivity';
import {ScheduleRepository} from '../src/features/schedule/data/ScheduleRepository';
import {GradeRepository} from '../src/features/grades/data/GradeRepository';
import {calculateGpa} from '../src/features/grades/domain/gpa';

let database: Database, schedules: ScheduleRepository, grades: GradeRepository;
const input = {
  academicTerm: '1st Sem',
  declaredUnits: 6,
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
  database = new Database({
    adapter: new LokiJSAdapter({
      schema,
      useWebWorker: false,
      useIncrementalIndexedDB: true,
      extraLokiOptions: {autosave: false},
    }),
    modelClasses: [Schedule, Subject, Expense, Due, ScheduleActivity],
  });
  schedules = new ScheduleRepository(database);
  grades = new GradeRepository(database);
});
it('saves grades with schedule activity and preserves them during ordinary subject edits', async () => {
  const subject = await schedules.saveSubject(input);
  expect(subject.grade).toBeNull();
  const parent = await subject.schedule.fetch();
  const created = parent.createdAt.getTime();
  const clock = jest.spyOn(Date, 'now').mockReturnValue(created + 60000);
  try {
    await grades.saveGrade(subject.id, 1.25);
    expect(subject.grade).toBe(1.25);
    expect(parent.updatedAt?.getTime()).toBe(created + 60000);
    expect(
      (
        await database
          .get<ScheduleActivity>('schedule_activities')
          .query()
          .fetch()
      ).at(-1),
    ).toMatchObject({
      kind: 'graded',
      label: 'CSC101 graded',
      detail: '1.25 · 3 units',
    });
    await schedules.saveSubject({
      ...input,
      subjectId: subject.id,
      subject: {...input.subject, title: 'New title'},
    });
    expect((await schedules.findSubject(subject.id)).grade).toBe(1.25);
    await grades.saveGrade(subject.id, null);
    expect(subject.grade).toBeNull();
  } finally {
    clock.mockRestore();
  }
});
it('rejects unsupported grades and avoids duplicate events for unchanged grades', async () => {
  const subject = await schedules.saveSubject(input);
  await expect(grades.saveGrade(subject.id, 4)).rejects.toThrow(
    'grading scale',
  );
  await grades.saveGrade(subject.id, 5);
  await grades.saveGrade(subject.id, 5);
  const history = await database
    .get<ScheduleActivity>('schedule_activities')
    .query()
    .fetch();
  expect(history.filter(item => item.kind === 'graded')).toHaveLength(1);
  expect(
    calculateGpa(await (await subject.schedule.fetch()).subjects.fetch()).value,
  ).toBe(5);
});
it('does not persist a grade or its activity when the transaction fails', async () => {
  const subject = await schedules.saveSubject(input);
  const batch = jest
    .spyOn(database.adapter, 'batch')
    .mockRejectedValueOnce(new Error('Disk full'));
  await expect(grades.saveGrade(subject.id, 2)).rejects.toThrow('Disk full');
  batch.mockRestore();
  expect(subject.grade).toBeNull();
  expect(
    (
      await database
        .get<ScheduleActivity>('schedule_activities')
        .query()
        .fetch()
    ).filter(item => item.kind === 'graded'),
  ).toHaveLength(0);
  await grades.saveGrade(subject.id, 2);
  expect(subject.grade).toBe(2);
});
