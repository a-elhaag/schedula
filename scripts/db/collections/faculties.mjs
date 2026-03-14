export default {
  name: 'faculties',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['institution_id', 'name', 'created_at'],
      properties: {
        institution_id: { bsonType: 'objectId' },
        name:           { bsonType: 'string' },
        created_at:     { bsonType: 'date' },
        deleted_at:     { bsonType: ['date', 'null'] },
      },
    },
  },
  indexes: [
    { key: { institution_id: 1 }, options: { name: 'institution_id' } },
    { key: { deleted_at: 1 },     options: { name: 'deleted_at' } },
  ],
};
