export default {
  name: 'constraints',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['institution_id', 'type', 'category', 'created_by', 'created_at'],
      properties: {
        institution_id: { bsonType: 'objectId' },
        term_label:     { bsonType: ['string', 'null'] },
        type:           { bsonType: 'string', enum: ['hard', 'soft'] },
        category: {
          bsonType: 'string',
          enum: [
            'no_room_double_booking',
            'staff_availability',
            'room_capacity',
            'room_label_match',
            'staff_day_off',
            'daily_hours',
            'working_days',
            'dept_level_conflict',
            'shared_lecture_conflict',
            'break_window',
            'max_consecutive_slots',
            'spread_sessions',
            'cluster_staff_days',
          ],
        },
        config:  { bsonType: ['object', 'null'] },
        weight:  { bsonType: ['double', 'int', 'null'] },
        scope: {
          bsonType: 'object',
          properties: {
            entity_type: { bsonType: ['string', 'null'] },
            entity_id:   { bsonType: ['objectId', 'null'] },
          },
        },
        created_by: { bsonType: 'objectId' },
        created_at: { bsonType: 'date' },
        deleted_at: { bsonType: ['date', 'null'] },
      },
    },
  },
  indexes: [
    { key: { institution_id: 1, term_label: 1, type: 1 }, options: { name: 'institution_term_type' } },
    { key: { deleted_at: 1 },                              options: { name: 'deleted_at' } },
  ],
};
