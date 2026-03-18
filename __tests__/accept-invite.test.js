/**
 * Accept Invite Route Integration Tests
 */

import { POST } from '@/app/api/auth/accept-invite/route';
import { createTestRequest, getJsonResponse, createTestUser, getAllUsers } from './utils';
import { generateToken } from '@/lib/auth';

describe('POST /api/auth/accept-invite', () => {
  it('should accept invite with valid token and password', async () => {
    const token = generateToken();
    const user = await createTestUser({
      email: 'invitee@example.com',
      role: 'student',
      invite_token: token,
      invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      password_hash: null,
    });

    const req = createTestRequest('POST', '/api/auth/accept-invite', {
      token,
      email: 'invitee@example.com',
      password: 'NewPassword123',
      name: 'Invited User',
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
    const data = getJsonResponse(response);
    expect(data.ok).toBe(true);
    expect(data.message).toContain('verify your email');

    // Check user was updated
    const users = await getAllUsers();
    const updatedUser = users.find(u => u._id.equals(user._id));
    expect(updatedUser.password_hash).toBeTruthy();
    expect(updatedUser.name).toBe('Invited User');
    expect(updatedUser.invite_token).toBeNull();
  });

  it('should reject accept-invite with invalid token', async () => {
    const req = createTestRequest('POST', '/api/auth/accept-invite', {
      token: 'invalid-token',
      email: 'test@example.com',
      password: 'NewPassword123',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = getJsonResponse(response);
    expect(data.message).toContain('invalid or has expired');
  });

  it('should reject accept-invite with expired token', async () => {
    const token = generateToken();
    const expiredDate = new Date(Date.now() - 1000);

    const user = await createTestUser({
      email: 'expired-invite@example.com',
      invite_token: token,
      invite_expires_at: expiredDate,
    });

    const req = createTestRequest('POST', '/api/auth/accept-invite', {
      token,
      email: 'expired-invite@example.com',
      password: 'NewPassword123',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = getJsonResponse(response);
    expect(data.message).toContain('invalid or has expired');
  });

  it('should reject accept-invite with email mismatch', async () => {
    const token = generateToken();
    const user = await createTestUser({
      email: 'invitee2@example.com',
      invite_token: token,
      invite_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const req = createTestRequest('POST', '/api/auth/accept-invite', {
      token,
      email: 'different@example.com',
      password: 'NewPassword123',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = getJsonResponse(response);
    expect(data.message).toContain('does not match');
  });

  it('should reject accept-invite with weak password', async () => {
    const token = generateToken();
    const user = await createTestUser({
      email: 'weak-pass@example.com',
      invite_token: token,
      invite_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const req = createTestRequest('POST', '/api/auth/accept-invite', {
      token,
      email: 'weak-pass@example.com',
      password: 'weakpass',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = getJsonResponse(response);
    expect(data.message).toContain('Password must');
  });
});
