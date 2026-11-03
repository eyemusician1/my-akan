import {Database} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import {schema} from './schema';
import {migrations} from './migrations';
import Schedule from './models/Schedule';
import Subject from './models/Subject';
import Expense from './models/Expense';
import Due from './models/Due';
import ScheduleActivity from './models/ScheduleActivity';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  // JSI enables lightning-fast synchronous SQLite access
  jsi: true,
  onSetUpError: error => {
    console.error('Database setup failed', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Schedule, Subject, Expense, Due, ScheduleActivity],
});
