import {
  addColumns,
  createTable,
  schemaMigrations,
} from '@nozbe/watermelondb/Schema/migrations';

// Version 1 is preserved in commit 1c0dd36; version 2 added only finance tables.
export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 'subjects',
          columns: [{name: 'grade', type: 'number', isOptional: true}],
        }),
      ],
    },
    {
      toVersion: 2,
      steps: [
        createTable({
          name: 'expenses',
          columns: [
            {name: 'title', type: 'string'},
            {name: 'amount', type: 'number'},
            {name: 'category', type: 'string'},
            {name: 'icon', type: 'string'},
            {name: 'created_at', type: 'number'},
          ],
        }),
        createTable({
          name: 'dues',
          columns: [
            {name: 'title', type: 'string'},
            {name: 'amount', type: 'number'},
            {name: 'is_paid', type: 'boolean'},
            {name: 'created_at', type: 'number'},
          ],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'schedules',
          columns: [{name: 'updated_at', type: 'number'}],
        }),
        createTable({
          name: 'schedule_activities',
          columns: [
            {name: 'schedule_id', type: 'string', isIndexed: true},
            {name: 'subject_id', type: 'string', isOptional: true},
            {name: 'kind', type: 'string'},
            {name: 'label', type: 'string'},
            {name: 'detail', type: 'string'},
            {name: 'created_at', type: 'number', isIndexed: true},
          ],
        }),
      ],
    },
  ],
});
