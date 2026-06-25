import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 2, // Bumped to version 2 to trigger the new tables
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
        { name: 'days', type: 'string' },
        { name: 'start_time', type: 'string' },
        { name: 'end_time', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    // --- NEW FINANCE TABLES ---
    tableSchema({
      name: 'expenses',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'category', type: 'string' },
        { name: 'icon', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'dues',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'is_paid', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});