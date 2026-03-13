export default {
  name: 'departments',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['institution_id', 'faculty_id', 'name', 'created_at'],
      properties: {
        institution_id: { bsonType: 'objectId' },
        faculty_id:     { bsonType: 'objectId' },
        name:           { bsonType: 'string' },
        created_at:     { bsonType: 'date' },
        deleted_at:     { bsonType: ['date', 'null'] },
      },
    },
  },
  indexes: [
    { key: { institution_id: 1, faculty_id: 1 }, options: { name: 'institution_faculty' } },
    { key: { deleted_at: 1 },                    options: { name: 'deleted_at' } },
  ],
};
