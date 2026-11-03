import {Database, Q} from '@nozbe/watermelondb';
import {combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';
import type Schedule from '../../../core/database/models/Schedule';
import type Subject from '../../../core/database/models/Subject';

export interface SavedSchedule {
  id: string;
  academicTerm: string;
  createdAt: Date;
  updatedAt?: Date;
  subjectCount: number;
  totalUnits: number;
  current: boolean;
}

/** Two subscriptions for the library, rather than fetching children per card. */
export function observeArchive(database: Database) {
  return combineLatest([
    database
      .get<Schedule>('schedules')
      .query(Q.sortBy('created_at', Q.desc))
      .observeWithColumns(['academic_term', 'created_at', 'updated_at']),
    database
      .get<Subject>('subjects')
      .query()
      .observeWithColumns(['units', 'schedule_id']),
  ]).pipe(
    map(([schedules, subjects]): SavedSchedule[] => {
      const totals = new Map<
        string,
        {subjectCount: number; totalUnits: number}
      >();
      for (const subject of subjects) {
        const id = subject.schedule.id;
        const value = totals.get(id) ?? {subjectCount: 0, totalUnits: 0};
        value.subjectCount += 1;
        value.totalUnits += subject.units;
        totals.set(id, value);
      }
      return schedules
        .filter(schedule => totals.has(schedule.id))
        .map((schedule, index) => ({
          id: schedule.id,
          academicTerm: schedule.academicTerm,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt,
          ...totals.get(schedule.id)!,
          current: index === 0,
        }));
    }),
  );
}
