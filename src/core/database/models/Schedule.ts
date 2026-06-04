import { Model } from '@nozbe/watermelondb';
import { field, date, children, readonly } from '@nozbe/watermelondb/decorators';

export default class Schedule extends Model {
  static table = 'schedules';

  static associations = {
    subjects: { type: 'has_many', foreignKey: 'schedule_id' },
  } as const;

  @field('academic_term') academicTerm!: string;
  @field('total_subjects') totalSubjects?: number;

  @readonly @date('created_at') createdAt!: Date;

  // Fetches all subjects tied to this specific term
  @children('subjects') subjects!: any;
}