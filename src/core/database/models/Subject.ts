import {Model, Relation} from '@nozbe/watermelondb';
import {
  field,
  json,
  relation,
  readonly,
  date,
} from '@nozbe/watermelondb/decorators';
import type Schedule from './Schedule';

const sanitizeDays = (rawDays: unknown): string[] => {
  return Array.isArray(rawDays)
    ? rawDays.filter((day): day is string => typeof day === 'string')
    : [];
};

export default class Subject extends Model {
  static table = 'subjects';

  static associations = {
    schedules: {type: 'belongs_to', key: 'schedule_id'},
  } as const;

  @field('code') code!: string;
  @field('section') section?: string;
  @field('title') title!: string;
  @field('units') units!: number;
  @field('room') room?: string;
  @field('instructor') instructor?: string;

  // Safely parses the SQLite string back into a JavaScript array
  @json('days', sanitizeDays) days!: string[];

  @field('start_time') startTime!: string;
  @field('end_time') endTime!: string;

  @relation('schedules', 'schedule_id') schedule!: Relation<Schedule>;

  @readonly @date('created_at') createdAt!: Date;
}
