/**
 * Signup Route Integration Tests
 */

import { POST } from '@/app/api/auth/signup/route';
import { createTestRequest, getJsonResponse, getAllUsers } from './utils';

describe('POST /api/auth/signup', () => {
  it('should create new user with valid data', async () => {
    const req = createTestRequest('POST', '/api/auth/signup', {
      name: 'New User',
      email: 'newuser@example.com',
      password: 'ValidPassword123',
    });

    const response = await POST(req);

    expect(response.status).toBe(201);
    const data = await getJsonResponse(response);
    expect(data.ok).toBe(true);
    expect(data.user.email).toBe('newuser@example.com');
    expect(data.message).toContain('verify your email');
  });

  it('should reject signup with invalid email', async () => {
    const req = createTestRequest('POST', '/api/auth/signup', {
      name: 'New User',
      email: 'invalid-email',
      password: 'ValidPassword123',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = await getJsonResponse(response);
    expect(data.message).toContain('valid email');
  });

  it('should reject signup with short name', async () => {
    const req = createTestRequest('POST', '/api/auth/signup', {
      name: 'A',
      email: 'user@example.com',
      password: 'ValidPassword123',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = await getJsonResponse(response);
    expect(data.message).toContain('full name');
  });

  it('should reject signup with weak password', async () => {
    const req = createTestRequest('POST', '/api/auth/signup', {
      name: 'New User',
      email: 'user@example.com',
      password: 'weakpass',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = await getJsonResponse(response);
    expect(data.message).toContain('Password must');
  });

  it('should reject duplicate email signup', async () => {
    // First signup
    const req1 = createTestRequest('POST', '/api/auth/signup', {
      name: 'User One',
      email: 'duplicate@example.com',
      password: 'ValidPassword123',
    });
    await POST(req1);

    // Second signup with same email
    const req2 = createTestRequest('POST', '/api/auth/signup', {
      name: 'User Two',
      email: 'duplicate@example.com',
      password: 'ValidPassword123',
    });

    const response = await POST(req2);

    expect(response.status).toBe(409);
    const data = await getJsonResponse(response);
    expect(data.message).toContain('already exists');
  });

  it('should store verification token', async () => {
    const req = createTestRequest('POST', '/api/auth/signup', {
      name: 'New User',
      email: 'verify@example.com',
      password: 'ValidPassword123',
    });

    const response = await POST(req);

    expect(response.status).toBe(201);
    const users = await getAllUsers();
    const user = users.find(u => u.email === 'verify@example.com');
    expect(user.email_verify_token).toBeTruthy();
    expect(user.email_verify_expires_at).toBeTruthy();
  });
});
