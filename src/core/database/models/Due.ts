import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Due extends Model {
  static table = 'dues';

  @text('title') title!: string;
  @field('amount') amount!: number;
  @field('is_paid') isPaid!: boolean;
  @readonly @date('created_at') createdAt!: Date;
}