/**
 * Signin Route Integration Tests
 */

import { POST } from '@/app/api/auth/signin/route';
import { createTestRequest, createTestResponse, getJsonResponse, createTestUser, getAllUsers } from './utils';
import { comparePassword } from '@/lib/password';

describe('POST /api/auth/signin', () => {
  it('should sign in user with valid credentials', async () => {
    // Setup
    const password = 'ValidPassword123';
    const user = await createTestUser({
      email: 'signin@example.com',
      password_hash: require('bcryptjs').hashSync(password, 10),
      email_verified_at: new Date(),
      invite_status: 'joined',
    });

    const req = createTestRequest('POST', '/api/auth/signin', {
      email: 'signin@example.com',
      password,
    });
    const res = createTestResponse();

    // Execute
    const response = await POST(req);

    // Assert
    expect(response.status).toBe(200);
    const data = getJsonResponse(response);
    expect(data.ok).toBe(true);
    expect(data.user.email).toBe('signin@example.com');
    expect(data.user.role).toBe('student');
  });

  it('should reject signin with invalid email', async () => {
    const req = createTestRequest('POST', '/api/auth/signin', {
      email: 'invalid-email',
      password: 'ValidPassword123',
    });
    const res = createTestResponse();

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = getJsonResponse(response);
    expect(data.message).toContain('valid email');
  });

  it('should reject signin with missing password', async () => {
    const req = createTestRequest('POST', '/api/auth/signin', {
      email: 'test@example.com',
      password: '',
    });
    const res = createTestResponse();

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = getJsonResponse(response);
    expect(data.message).toContain('password');
  });

  it('should reject signin for non-existent user', async () => {
    const req = createTestRequest('POST', '/api/auth/signin', {
      email: 'nonexistent@example.com',
      password: 'ValidPassword123',
    });
    const res = createTestResponse();

    const response = await POST(req);

    expect(response.status).toBe(401);
    const data = getJsonResponse(response);
    expect(data.message).toContain('Invalid email or password');
  });

  it('should reject signin with wrong password', async () => {
    const user = await createTestUser({
      email: 'signin2@example.com',
      password_hash: require('bcryptjs').hashSync('CorrectPassword123', 10),
      email_verified_at: new Date(),
      invite_status: 'joined',
    });

    const req = createTestRequest('POST', '/api/auth/signin', {
      email: 'signin2@example.com',
      password: 'WrongPassword123',
    });
    const res = createTestResponse();

    const response = await POST(req);

    expect(response.status).toBe(401);
    const data = getJsonResponse(response);
    expect(data.message).toContain('Invalid email or password');
  });

  it('should reject signin if email not verified', async () => {
    const user = await createTestUser({
      email: 'unverified@example.com',
      password_hash: require('bcryptjs').hashSync('ValidPassword123', 10),
      email_verified_at: null,
      invite_status: 'pending',
    });

    const req = createTestRequest('POST', '/api/auth/signin', {
      email: 'unverified@example.com',
      password: 'ValidPassword123',
    });
    const res = createTestResponse();

    const response = await POST(req);

    expect(response.status).toBe(403);
    const data = getJsonResponse(response);
    expect(data.message).toContain('not yet activated');
  });
});
