import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import Schedule from './models/Schedule';
import Subject from './models/Subject';

const adapter = new SQLiteAdapter({
  schema,
  // JSI enables lightning-fast synchronous SQLite access
  jsi: true,
  onSetUpError: error => {
    console.error("Database setup failed", error);
  }
});

export const database = new Database({
  adapter,
  modelClasses: [
    Schedule,
    Subject,
  ],
});