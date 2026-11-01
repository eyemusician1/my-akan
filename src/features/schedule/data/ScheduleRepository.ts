import {Database, Model, Q} from '@nozbe/watermelondb';
import Schedule from '../../../core/database/models/Schedule';
import Subject from '../../../core/database/models/Subject';
import {SaveSubjectInput} from '../domain/types';
import {
  findTimeConflict,
  getUnitLimit,
  ScheduleValidationError,
  validateSubject,
} from '../domain/rules';

/** Owns schedule persistence. Native side effects belong to the application service. */
export class ScheduleRepository {
  constructor(private readonly database: Database) {}

  findSubject(id: string) {
    return this.database.get<Subject>('subjects').find(id);
  }

  async getLatestSchedule(): Promise<Schedule | undefined> {
    const schedules = await this.database
      .get<Schedule>('schedules')
      .query(Q.sortBy('created_at', Q.desc), Q.take(1))
      .fetch();
    return schedules[0];
  }

  async getScheduleForTerm(
    academicTerm: string,
  ): Promise<Schedule | undefined> {
    const schedules = await this.database
      .get<Schedule>('schedules')
      .query(Q.where('academic_term', academicTerm), Q.take(1))
      .fetch();
    return schedules[0];
  }

  async getTermSummary(academicTerm: string) {
    const schedule = await this.getScheduleForTerm(academicTerm);
    const subjects = schedule ? await schedule.subjects.fetch() : [];
    return {
      declaredUnits: schedule?.totalSubjects,
      subjectCount: subjects.length,
      totalUnits: subjects.reduce((sum, subject) => sum + subject.units, 0),
    };
  }

  async saveSubject(input: SaveSubjectInput): Promise<Subject> {
    validateSubject(input.subject);
    if (!input.academicTerm.trim()) {
      throw new ScheduleValidationError(
        'Invalid Term',
        'Choose an academic term.',
      );
    }
    if (
      input.declaredUnits !== undefined &&
      (!Number.isInteger(input.declaredUnits) ||
        input.declaredUnits < 1 ||
        input.declaredUnits > getUnitLimit(input.academicTerm))
    ) {
      throw new ScheduleValidationError(
        'Invalid Units',
        'The declared units must be within the term limit.',
      );
    }

    return this.database.write(async () => {
      const schedule = await this.getScheduleForTerm(input.academicTerm);
      const existing = schedule ? await schedule.subjects.fetch() : [];
      const otherSubjects = existing.filter(
        subject => subject.id !== input.subjectId,
      );
      const conflict = findTimeConflict(input.subject, otherSubjects);
      if (conflict) {
        throw new ScheduleValidationError(
          'Schedule Conflict',
          `This time overlaps with ${conflict.code} (${conflict.startTime} - ${conflict.endTime}) on shared days. Please adjust the time.`,
        );
      }
      const totalUnits =
        otherSubjects.reduce((sum, subject) => sum + subject.units, 0) +
        input.subject.units;
      const declaredUnits = input.declaredUnits ?? schedule?.totalSubjects;
      if (
        totalUnits >
        Math.min(getUnitLimit(input.academicTerm), declaredUnits ?? Infinity)
      ) {
        throw new ScheduleValidationError(
          'Unit Limit Reached',
          'This subject would exceed the declared or maximum units for the term.',
        );
      }

      // Resolve all reads before preparing records; commit parent, child and cleanup together.
      const subject = input.subjectId
        ? await this.findSubject(input.subjectId)
        : undefined;
      const oldSchedule = subject ? await subject.schedule.fetch() : undefined;
      const removeOldSchedule =
        oldSchedule &&
        oldSchedule.id !== schedule?.id &&
        (await oldSchedule.subjects.fetchCount()) === 1;
      const operations: Model[] = [];
      const updateSchedule = (record: Schedule) => {
        record.academicTerm = input.academicTerm;
        if (input.declaredUnits !== undefined) {
          record.totalSubjects = input.declaredUnits;
        }
      };
      const targetSchedule = schedule
        ? schedule.prepareUpdate(updateSchedule)
        : this.database
            .get<Schedule>('schedules')
            .prepareCreate(updateSchedule);
      operations.push(targetSchedule);

      const updateSubject = (record: Subject) => {
        Object.assign(record, input.subject);
        record.schedule.set(targetSchedule);
      };
      const savedSubject = subject
        ? subject.prepareUpdate(updateSubject)
        : this.database.get<Subject>('subjects').prepareCreate(updateSubject);
      operations.push(savedSubject);
      if (removeOldSchedule) {
        operations.push(oldSchedule.prepareDestroyPermanently());
      }
      await this.database.batch(...operations);
      return savedSubject;
    });
  }

  async deleteSubject(id: string): Promise<void> {
    await this.database.write(async () => {
      const subject = await this.findSubject(id);
      const schedule = await subject.schedule.fetch();
      const isLastSubject = (await schedule.subjects.fetchCount()) === 1;
      await this.database.batch(
        subject.prepareDestroyPermanently(),
        isLastSubject ? schedule.prepareDestroyPermanently() : null,
      );
    });
  }

  async deleteSchedule(id: string): Promise<void> {
    await this.database.write(async () => {
      const schedule = await this.database.get<Schedule>('schedules').find(id);
      const subjects = await schedule.subjects.fetch();
      await this.database.batch(
        ...subjects.map(subject => subject.prepareDestroyPermanently()),
        schedule.prepareDestroyPermanently(),
      );
    });
  }

  async cleanupEmptySchedules(): Promise<void> {
    await this.database.write(async () => {
      const schedules = await this.database
        .get<Schedule>('schedules')
        .query()
        .fetch();
      const empty: Schedule[] = [];
      for (const schedule of schedules) {
        if ((await schedule.subjects.fetchCount()) === 0) {
          empty.push(schedule);
        }
      }
      await this.database.batch(
        ...empty.map(schedule => schedule.prepareDestroyPermanently()),
      );
    });
  }
}
