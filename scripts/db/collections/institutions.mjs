export default {
  name: 'institutions',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'slug', 'active_term', 'settings', 'created_at'],
      properties: {
        name: { bsonType: 'string' },
        slug: { bsonType: 'string' },
        active_term: {
          bsonType: 'object',
          required: ['label', 'start_date', 'end_date', 'working_days'],
          properties: {
            label:        { bsonType: 'string' },
            start_date:   { bsonType: 'string' },
            end_date:     { bsonType: 'string' },
            working_days: { bsonType: 'array', items: { bsonType: 'string' } },
          },
        },
        settings: {
          bsonType: 'object',
          required: ['slot_duration_minutes', 'daily_start', 'daily_end', 'max_consecutive_slots'],
          properties: {
            slot_duration_minutes: { bsonType: 'int' },
            daily_start:           { bsonType: 'string' },
            daily_end:             { bsonType: 'string' },
            max_consecutive_slots: { bsonType: 'int' },
          },
        },
        created_at: { bsonType: 'date' },
        deleted_at: { bsonType: ['date', 'null'] },
      },
    },
  },
  indexes: [
    { key: { slug: 1 },       options: { unique: true, name: 'slug_unique' } },
    { key: { deleted_at: 1 }, options: { name: 'deleted_at' } },
  ],
};
