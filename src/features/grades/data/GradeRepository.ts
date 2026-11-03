import {Database} from '@nozbe/watermelondb';
import Subject from '../../../core/database/models/Subject';
import ScheduleActivity from '../../../core/database/models/ScheduleActivity';
import {isValidGrade} from '../domain/gpa';

export class GradeRepository {
  constructor(private readonly database: Database) {}
  async saveGrade(subjectId: string, grade: number | null): Promise<void> {
    if (grade !== null && !isValidGrade(grade))
      throw new Error('Choose a grade from the grading scale.');
    await this.database.write(async () => {
      const subject = await this.database
        .get<Subject>('subjects')
        .find(subjectId);
      if ((subject.grade ?? null) === grade) return;
      const schedule = await subject.schedule.fetch();
      const subjectBefore = {...subject._raw},
        scheduleBefore = {...schedule._raw};
      const event = this.database
        .get<ScheduleActivity>('schedule_activities')
        .prepareCreate(record => {
          record.scheduleId = schedule.id;
          record.subjectId = subject.id;
          record.kind = 'graded';
          record.label = `${subject.code} ${
            grade === null ? 'grade cleared' : 'graded'
          }`;
          record.detail =
            grade === null
              ? subject.title
              : `${grade.toFixed(2)} · ${subject.units} units`;
        });
      try {
        await this.database.batch(
          subject.prepareUpdate(record => {
            record.grade = grade;
          }),
          schedule.prepareUpdate(),
          event,
        );
      } catch (error) {
        // Watermelon prepares changes in its cache before the adapter commits them.
        // Restore those snapshots so a failed save can be retried with the same grade.
        subject._raw = subjectBefore;
        schedule._raw = scheduleBefore;
        subject._preparedState = null;
        schedule._preparedState = null;
        throw error;
      }
    });
  }
}
