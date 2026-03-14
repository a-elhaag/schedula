export default {
  name: 'courses',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['institution_id', 'faculty_id', 'department_id', 'code', 'name', 'credit_hours', 'sections', 'created_at'],
      properties: {
        institution_id: { bsonType: 'objectId' },
        faculty_id:     { bsonType: 'objectId' },
        department_id:  { bsonType: 'objectId' },
        code:           { bsonType: 'string' },
        name:           { bsonType: 'string' },
        credit_hours:   { bsonType: 'int' },
        sections: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: [
              'section_id', 'type', 'year_levels', 'slots_per_week',
              'slot_duration_minutes', 'capacity', 'required_room_label', 'assigned_staff',
            ],
            properties: {
              section_id:            { bsonType: 'string' },
              type:                  { bsonType: 'string', enum: ['lecture', 'lab', 'tutorial'] },
              year_levels:           { bsonType: 'array', items: { bsonType: 'int' } },
              slots_per_week:        { bsonType: 'int' },
              slot_duration_minutes: { bsonType: 'int' },
              capacity:              { bsonType: 'int' },
              required_room_label:   { bsonType: 'string' },
              assigned_staff:        { bsonType: 'array', items: { bsonType: 'objectId' } },
              shared_with:           { bsonType: 'array', items: { bsonType: 'objectId' } },
            },
          },
        },
        created_at: { bsonType: 'date' },
        deleted_at: { bsonType: ['date', 'null'] },
      },
    },
  },
  indexes: [
    { key: { institution_id: 1, code: 1 }, options: { unique: true, name: 'institution_code_unique' } },
    { key: { department_id: 1 },           options: { name: 'department_id' } },
    { key: { deleted_at: 1 },              options: { name: 'deleted_at' } },
  ],
};
