export default {
  name: 'rooms',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['institution_id', 'name', 'label', 'created_at'],
      properties: {
        institution_id: { bsonType: 'objectId' },
        name:           { bsonType: 'string' },
        label:          { bsonType: 'string' },
        building:       { bsonType: ['string', 'null'] },
        created_at:     { bsonType: 'date' },
        deleted_at:     { bsonType: ['date', 'null'] },
      },
    },
  },
  indexes: [
    { key: { institution_id: 1, label: 1 }, options: { name: 'institution_label' } },
    { key: { deleted_at: 1 },               options: { name: 'deleted_at' } },
  ],
};
