import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'schedules',
      columns: [
        { name: 'academic_term', type: 'string' },
        { name: 'total_subjects', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'subjects',
      columns: [
        { name: 'schedule_id', type: 'string', isIndexed: true },
        { name: 'code', type: 'string' },
        { name: 'section', type: 'string', isOptional: true },
        { name: 'title', type: 'string' },
        { name: 'units', type: 'number' },
        { name: 'room', type: 'string', isOptional: true },
        { name: 'instructor', type: 'string', isOptional: true },
        { name: 'days', type: 'string' }, // Arrays must be stored as strings in SQLite
        { name: 'start_time', type: 'string' },
        { name: 'end_time', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});