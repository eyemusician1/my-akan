import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'subjects',
      columns: [
        { name: 'code', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'units', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'schedule_slots',
      columns: [
        { name: 'subject_id', type: 'string', isIndexed: true },
        { name: 'day_of_week', type: 'string' },
        { name: 'start_time', type: 'string' },
        { name: 'end_time', type: 'string' },
        { name: 'room', type: 'string' },
      ]
    }),
    tableSchema({
      name: 'payment_dues',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'is_paid', type: 'boolean' },
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'receipt_image_uri', type: 'string', isOptional: true },
      ]
    })
  ]
});
