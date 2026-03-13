export default {
  name: 'schedule_snapshots',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['institution_id', 'job_id', 'term_label', 'generated_at', 'entries'],
      properties: {
        institution_id: { bsonType: 'objectId' },
        job_id:         { bsonType: 'objectId' },
        term_label:     { bsonType: 'string' },
        generated_at:   { bsonType: 'date' },
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
        warnings: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              type:          { bsonType: 'string' },
              constraint_id: { bsonType: 'objectId' },
              message:       { bsonType: 'string' },
            },
          },
        },
      },
    },
  },
  indexes: [
    { key: { institution_id: 1, job_id: 1 }, options: { name: 'institution_job' } },
    // TTL — auto-delete unapproved snapshots after 7 days
    { key: { generated_at: 1 },              options: { expireAfterSeconds: 604800, name: 'ttl_7d' } },
  ],
};
