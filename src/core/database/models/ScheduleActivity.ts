import {Model} from '@nozbe/watermelondb';
import {date, field, readonly} from '@nozbe/watermelondb/decorators';

export type ScheduleActivityKind =
  | 'added'
  | 'updated'
  | 'removed'
  | 'moved'
  | 'schedule_removed'
  | 'graded';

/** A small snapshot, retained even when the subject is removed. */
export default class ScheduleActivity extends Model {
  static table = 'schedule_activities';

  @field('schedule_id') scheduleId!: string;
  @field('subject_id') subjectId?: string;
  @field('kind') kind!: ScheduleActivityKind;
  @field('label') label!: string;
  @field('detail') detail!: string;
  @readonly @date('created_at') createdAt!: Date;
}
