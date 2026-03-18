/**
 * MongoDB Index Creation Script
 * Run with: node --env-file=.env scripts/create-indexes.mjs
 *
 * Creates essential indexes for auth and user collection queries.
 * Improves query performance significantly for frequently accessed fields.
 */

import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? 'schedula';

if (!uri) {
  console.error('Error: MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

async function createIndexes() {
  const client = new MongoClient(uri, options);

  try {
    await client.connect();
    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    console.log(`📊 Creating indexes for database: ${dbName}`);
    console.log('-------------------------------------------');

    // Index 1: Email (single field, unique)
    // Used in: signin, signup, forgot-password, resend-verification, invite, accept-invite
    try {
      await usersCollection.createIndex({ email: 1 }, { unique: true });
      console.log('✓ Index created: email (unique)');
    } catch (error) {
      if (error.code === 11000) {
        console.log('✓ Index already exists: email (unique)');
      } else {
        throw error;
      }
    }

    // Index 2: Email verification token
    // Used in: verify-email route
    try {
      await usersCollection.createIndex({ email_verify_token: 1 });
      console.log('✓ Index created: email_verify_token');
    } catch (error) {
      console.log('✓ Index already exists or error:', error.message);
    }

    // Index 3: Password reset token
    // Used in: reset-password route
    try {
      await usersCollection.createIndex({ password_reset_token: 1 });
      console.log('✓ Index created: password_reset_token');
    } catch (error) {
      console.log('✓ Index already exists or error:', error.message);
    }

    // Index 4: Invite token
    // Used in: accept-invite route
    try {
      await usersCollection.createIndex({ invite_token: 1 });
      console.log('✓ Index created: invite_token');
    } catch (error) {
      console.log('✓ Index already exists or error:', error.message);
    }

    // Index 5: Invite status
    // Used in: filtering users by invitation status
    try {
      await usersCollection.createIndex({ invite_status: 1 });
      console.log('✓ Index created: invite_status');
    } catch (error) {
      console.log('✓ Index already exists or error:', error.message);
    }

    // Index 6: Institution ID + Role
    // Used in: coordinator setup, staff schedules filtering
    try {
      await usersCollection.createIndex({ institution_id: 1, role: 1 });
      console.log('✓ Index created: institution_id + role (compound)');
    } catch (error) {
      console.log('✓ Index already exists or error:', error.message);
    }

    // Index 7: Created at (for audit logging and user tracking)
    try {
      await usersCollection.createIndex({ created_at: -1 });
      console.log('✓ Index created: created_at (descending)');
    } catch (error) {
      console.log('✓ Index already exists or error:', error.message);
    }

    console.log('-------------------------------------------');
    console.log('✅ Index creation completed successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createIndexes();
