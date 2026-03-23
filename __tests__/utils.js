/**
 * Test Utilities
 * Helper functions for API route testing
 */

import { createResponse } from 'node-mocks-http';
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
    institution_id: new ObjectId('669b538e5aa373449d761b12'),
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

  const headers = new Headers({
    'x-request-id': 'test-request-id',
    'Cookie': `auth_token=${token}`,
  });

  return new Request(`http://localhost${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
}

/**
 * Create a basic HTTP request
 */
export function createTestRequest(method, url, body = null, headers = {}) {
  const requestHeaders = new Headers({
    'x-request-id': 'test-request-id',
    ...headers,
  });

  return new Request(`http://localhost${url}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : null,
  });
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
export async function getJsonResponse(res) {
  try {
    if (res instanceof Response) {
      return await res.json();
    }
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
