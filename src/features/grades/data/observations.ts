import {Q} from '@nozbe/watermelondb';
import {database} from '../../../core/database';
import type Schedule from '../../../core/database/models/Schedule';
import type Subject from '../../../core/database/models/Subject';
import type {GradeBookTerm} from '../domain/gpa';

export const observeGrades = () => ({
  schedules: database
    .get<Schedule>('schedules')
    .query(Q.sortBy('created_at', Q.desc))
    .observe(),
  subjects: database
    .get<Subject>('subjects')
    .query()
    .observeWithColumns(['grade', 'units', 'code', 'title', 'schedule_id']),
});

export function toGradeBook(
  schedules: Schedule[],
  subjects: Subject[],
): GradeBookTerm[] {
  const byTerm = new Map<string, GradeBookTerm['subjects']>();
  for (const subject of subjects) {
    const scheduleId = subject.schedule.id;
    const group = byTerm.get(scheduleId) ?? [];
    group.push({
      id: subject.id,
      code: subject.code,
      title: subject.title,
      units: subject.units,
      grade: subject.grade,
      scheduleId,
    });
    byTerm.set(scheduleId, group);
  }
  return schedules.map(schedule => ({
    id: schedule.id,
    academicTerm: schedule.academicTerm,
    subjects: (byTerm.get(schedule.id) ?? []).sort((a, b) =>
      a.code.localeCompare(b.code),
    ),
  }));
}
