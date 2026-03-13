export default {
  name: 'users',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['institution_id', 'email', 'password_hash', 'role', 'name', 'invite_status', 'created_at'],
      properties: {
        institution_id:     { bsonType: 'objectId' },
        faculty_id:         { bsonType: ['objectId', 'null'] },
        department_id:      { bsonType: ['objectId', 'null'] },
        email:              { bsonType: 'string' },
        password_hash:      { bsonType: 'string' },
        role:               { bsonType: 'string', enum: ['coordinator', 'professor', 'ta', 'student'] },
        name:               { bsonType: 'string' },
        invite_status:      { bsonType: 'string', enum: ['pending', 'joined'] },
        refresh_token_hash: { bsonType: ['string', 'null'] },
        created_at:         { bsonType: 'date' },
        deleted_at:         { bsonType: ['date', 'null'] },
      },
    },
  },
  indexes: [
    { key: { email: 1 },                     options: { unique: true, name: 'email_unique' } },
    { key: { institution_id: 1, role: 1 },   options: { name: 'institution_role' } },
    { key: { deleted_at: 1 },                options: { name: 'deleted_at' } },
  ],
};
