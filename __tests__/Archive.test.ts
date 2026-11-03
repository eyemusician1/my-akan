import {afterEach, beforeEach, expect, it, jest} from '@jest/globals';
import {Database} from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import {firstValueFrom} from 'rxjs';
import {filter} from 'rxjs/operators';
import {schema} from '../src/core/database/schema';
import Schedule from '../src/core/database/models/Schedule';
import Subject from '../src/core/database/models/Subject';
import Expense from '../src/core/database/models/Expense';
import Due from '../src/core/database/models/Due';
import ScheduleActivity from '../src/core/database/models/ScheduleActivity';
import {ScheduleRepository} from '../src/features/schedule/data/ScheduleRepository';
import {observeArchive} from '../src/features/schedule/data/archive';

let database: Database;
let repository: ScheduleRepository;
const subject = {
  code: 'CSC101',
  title: 'Computing',
  units: 3,
  section: '',
  room: '',
  instructor: '',
  days: [],
  startTime: '',
  endTime: '',
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
  jest.spyOn(Date, 'now').mockReturnValue(new Date(2026, 10, 3, 9).getTime());
});
afterEach(() => {
  jest.restoreAllMocks();
});

it('includes the only saved schedule and derives its count and units from saved subjects', async () => {
  expect(await firstValueFrom(observeArchive(database))).toEqual([]);
  const saved = await repository.saveSubject({
    academicTerm: '1st Sem',
    declaredUnits: 6,
    subject,
  });
  const entries = await firstValueFrom(observeArchive(database));
  expect(entries).toEqual([
    expect.objectContaining({
      id: saved.schedule.id,
      academicTerm: '1st Sem',
      subjectCount: 1,
      totalUnits: 3,
      current: true,
    }),
  ]);
});

it('updates a live library when another term is saved, an older subject changes, and a term is deleted', async () => {
  const first = await repository.saveSubject({
    academicTerm: '1st Sem',
    declaredUnits: 6,
    subject,
  });
  const archive = observeArchive(database);
  const created = firstValueFrom(
    archive.pipe(filter(entries => entries.length === 2)),
  );
  jest.mocked(Date.now).mockReturnValue(new Date(2026, 10, 3, 10).getTime());
  const second = await repository.saveSubject({
    academicTerm: '2nd Sem',
    declaredUnits: 6,
    subject,
  });
  const entries = await created;
  expect(entries.map(entry => entry.id)).toEqual([
    second.schedule.id,
    first.schedule.id,
  ]);
  expect(entries.map(entry => entry.current)).toEqual([true, false]);
  const updated = firstValueFrom(
    archive.pipe(
      filter(rows =>
        rows.some(row => row.id === first.schedule.id && row.totalUnits === 4),
      ),
    ),
  );
  jest.mocked(Date.now).mockReturnValue(new Date(2026, 10, 3, 11).getTime());
  await repository.saveSubject({
    academicTerm: '1st Sem',
    declaredUnits: 6,
    subjectId: first.id,
    subject: {...subject, units: 4},
  });
  const afterEdit = await updated;
  expect(afterEdit[0].id).toBe(second.schedule.id);
  expect(afterEdit[1].updatedAt?.getTime()).toBe(Date.now());
  expect(afterEdit[1].subjectCount).toBe(1);
  const removed = firstValueFrom(
    archive.pipe(
      filter(rows => rows.length === 1 && rows[0].id === first.schedule.id),
    ),
  );
  await repository.deleteSchedule(second.schedule.id);
  expect((await removed)[0].current).toBe(true);
  await repository.deleteSchedule(first.schedule.id);
  expect(await firstValueFrom(archive)).toEqual([]);
});

it('hides empty schedule records rather than showing placeholder cards', async () => {
  await database.write(async () => {
    await database.get<Schedule>('schedules').create(record => {
      record.academicTerm = 'Summer';
    });
  });
  expect(await firstValueFrom(observeArchive(database))).toEqual([]);
});
