export default {
  name: 'schedules',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: [
        'institution_id', 'term_label', 'approved_by', 'approved_at',
        'snapshot_id', 'entries', 'is_published', 'created_at',
      ],
      properties: {
        institution_id: { bsonType: 'objectId' },
        term_label:     { bsonType: 'string' },
        approved_by:    { bsonType: 'objectId' },
        approved_at:    { bsonType: 'date' },
        snapshot_id:    { bsonType: 'objectId' },
        entries: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['course_id', 'section_id', 'room_id', 'staff_id', 'day', 'start', 'end'],
            properties: {
              course_id:  { bsonType: 'objectId' },
              section_id: { bsonType: 'string' },
              room_id:    { bsonType: 'objectId' },
              staff_id:   { bsonType: 'objectId' },
              day:        { bsonType: 'string' },
              start:      { bsonType: 'string' },
              end:        { bsonType: 'string' },
            },
          },
        },
        is_published: { bsonType: 'bool' },
        published_at: { bsonType: ['date', 'null'] },
        created_at:   { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { institution_id: 1, term_label: 1 },   options: { unique: true, name: 'institution_term_unique' } },
    { key: { institution_id: 1, is_published: 1 }, options: { name: 'institution_published' } },
    // Multikey — MongoDB auto-promotes to multikey when the field contains an array
    { key: { 'entries.staff_id': 1 },              options: { name: 'entries_staff_id' } },
    { key: { 'entries.room_id': 1 },               options: { name: 'entries_room_id' } },
  ],
};
