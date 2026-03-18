/**
 * Verify Email Route Integration Tests
 */

import { POST } from '@/app/api/auth/verify-email/route';
import { createTestRequest, getJsonResponse, createTestUser, getAllUsers } from './utils';
import { generateToken } from '@/lib/auth';
import { getDb } from '@/lib/db';

describe('POST /api/auth/verify-email', () => {
  it('should verify email with valid token', async () => {
    // Create user with verification token
    const token = generateToken();
    const user = await createTestUser({
      email: 'verify@example.com',
      email_verify_token: token,
      email_verify_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      email_verified_at: null,
      invite_status: 'pending',
    });

    const req = createTestRequest('POST', '/api/auth/verify-email', {
      token,
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
    const data = getJsonResponse(response);
    expect(data.ok).toBe(true);
    expect(data.message).toContain('successfully');

    // Check user is now verified
    const users = await getAllUsers();
    const updatedUser = users.find(u => u._id.equals(user._id));
    expect(updatedUser.email_verified_at).toBeTruthy();
    expect(updatedUser.invite_status).toBe('joined');
  });

  it('should reject verification with invalid token', async () => {
    const req = createTestRequest('POST', '/api/auth/verify-email', {
      token: 'invalid-token-123',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = getJsonResponse(response);
    expect(data.message).toContain('invalid or has expired');
  });

  it('should reject verification with expired token', async () => {
    const token = generateToken();
    const expiredDate = new Date(Date.now() - 1000); // 1 second ago

    const user = await createTestUser({
      email: 'expired@example.com',
      email_verify_token: token,
      email_verify_expires_at: expiredDate,
      email_verified_at: null,
    });

    const req = createTestRequest('POST', '/api/auth/verify-email', {
      token,
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = getJsonResponse(response);
    expect(data.message).toContain('invalid or has expired');
  });

  it('should reject verification with too-short token', async () => {
    const req = createTestRequest('POST', '/api/auth/verify-email', {
      token: 'short',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = getJsonResponse(response);
    expect(data.message).toContain('invalid or has expired');
  });
});
