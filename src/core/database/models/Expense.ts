import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Expense extends Model {
  static table = 'expenses';

  @text('title') title!: string;
  @field('amount') amount!: number;
  @text('category') category!: string;
  @text('icon') icon!: string;
  @readonly @date('created_at') createdAt!: Date;
}