export default {
  name: 'availability',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['institution_id', 'user_id', 'term_label', 'submitted_at'],
      properties: {
        institution_id: { bsonType: 'objectId' },
        user_id:        { bsonType: 'objectId' },
        term_label:     { bsonType: 'string' },
        day_off:        { bsonType: ['string', 'null'] },
        preferred_break: {
          bsonType: 'object',
          properties: {
            start: { bsonType: 'string' },
            end:   { bsonType: 'string' },
          },
        },
        submitted_at: { bsonType: 'date' },
        updated_at:   { bsonType: ['date', 'null'] },
      },
    },
  },
  indexes: [
    { key: { user_id: 1, term_label: 1 },        options: { unique: true, name: 'user_term_unique' } },
    { key: { institution_id: 1, term_label: 1 }, options: { name: 'institution_term' } },
  ],
};
