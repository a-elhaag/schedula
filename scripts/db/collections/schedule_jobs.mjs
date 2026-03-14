export default {
  name: 'schedule_jobs',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['institution_id', 'term_label', 'status', 'triggered_by', 'triggered_at'],
      properties: {
        institution_id: { bsonType: 'objectId' },
        term_label:     { bsonType: 'string' },
        status:         { bsonType: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
        triggered_by:   { bsonType: 'objectId' },
        triggered_at:   { bsonType: 'date' },
        completed_at:   { bsonType: ['date', 'null'] },
        error:          { bsonType: ['string', 'null'] },
        solver_meta: {
          bsonType: ['object', 'null'],
          properties: {
            duration_ms:     { bsonType: 'int' },
            objective_score: { bsonType: 'double' },
            hard_violations: { bsonType: 'int' },
          },
        },
        result_snapshot_id: { bsonType: ['objectId', 'null'] },
      },
    },
  },
  indexes: [
    { key: { institution_id: 1, status: 1 },     options: { name: 'institution_status' } },
    { key: { institution_id: 1, term_label: 1 }, options: { name: 'institution_term' } },
  ],
};
