/**
 * Test Utilities
 * Helper functions for API route testing
 */

import { createRequest, createResponse } from 'node-mocks-http';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { signToken } from '@/lib/jwt';

/**
 * Create a test user in the database
 */
export async function createTestUser(userData = {}) {
  const db = await getDb();
  const usersCollection = db.collection('users');

  const defaultUser = {
    institution_id: new ObjectId('669b538e5aa373449d761b122'),
    email: 'test@example.com',
    password_hash: await hashPassword('TestPassword123'),
    role: 'student',
    name: 'Test User',
    invite_status: 'joined',
    email_verified_at: new Date(),
    created_at: new Date(),
  };

  const user = { ...defaultUser, ...userData };
  const result = await usersCollection.insertOne(user);

  return {
    _id: result.insertedId,
    ...user,
  };
}

/**
 * Create an authenticated request with JWT token
 */
export function createAuthRequest(method, url, user, body = null) {
  const token = signToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    institution: user.institution_id.toString(),
  });

  const req = createRequest({
    method,
    url,
    headers: {
      'x-request-id': 'test-request-id',
    },
    cookies: {
      auth_token: token,
    },
  });

  if (body) {
    req._setBody(JSON.stringify(body));
  }

  return req;
}

/**
 * Create a basic HTTP request
 */
export function createTestRequest(method, url, body = null, headers = {}) {
  const req = createRequest({
    method,
    url,
    headers: {
      'x-request-id': 'test-request-id',
      ...headers,
    },
  });

  if (body) {
    req._setBody(JSON.stringify(body));
  }

  return req;
}

/**
 * Create a response object for testing
 */
export function createTestResponse() {
  return createResponse({
    eventEmitter: require('events').EventEmitter,
  });
}

/**
 * Extract JSON response from response object
 */
export function getJsonResponse(res) {
  try {
    return JSON.parse(res._getData());
  } catch {
    return null;
  }
}

/**
 * Get all users from test database
 */
export async function getAllUsers() {
  const db = await getDb();
  const usersCollection = db.collection('users');
  return usersCollection.find({}).toArray();
}

/**
 * Clear all test data from database
 */
export async function clearDatabase() {
  const db = await getDb();
  const collections = await db.listCollections().toArray();

  for (const collection of collections) {
    await db.collection(collection.name).deleteMany({});
  }
}
