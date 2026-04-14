/**
 * Reset Password Route Integration Tests
 */

import { POST } from '@/app/api/auth/reset-password/route';
import { createTestRequest, getJsonResponse, createTestUser, getAllUsers } from './utils';
import { generateToken } from '@/lib/auth';

describe('POST /api/auth/reset-password', () => {
  it('should reset password with valid token', async () => {
    const token = generateToken();
    const user = await createTestUser({
      email: 'reset-user@example.com',
      password_hash: 'old-hash',
      password_reset_token: token,
      password_reset_expires_at: new Date(Date.now() + 60 * 60 * 1000),
    });

    const req = createTestRequest('POST', '/api/auth/reset-password', {
      token,
      password: 'NewPassword123',
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
    const data = await getJsonResponse(response);
    expect(data.ok).toBe(true);
    expect(data.message).toContain('successfully');

    // Check password was updated
    const users = await getAllUsers();
    const updatedUser = users.find(u => u._id.equals(user._id));
    expect(updatedUser.password_hash).not.toBe('old-hash');
    expect(updatedUser.password_reset_token).toBeUndefined();
  });

  it('should reject reset-password with invalid token', async () => {
    const req = createTestRequest('POST', '/api/auth/reset-password', {
      token: 'invalid-token',
      password: 'NewPassword123',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = await getJsonResponse(response);
    expect(data.message).toContain('invalid or has expired');
  });

  it('should reject reset-password with expired token', async () => {
    const token = generateToken();
    const expiredDate = new Date(Date.now() - 1000);

    const user = await createTestUser({
      email: 'expired-reset@example.com',
      password_reset_token: token,
      password_reset_expires_at: expiredDate,
    });

    const req = createTestRequest('POST', '/api/auth/reset-password', {
      token,
      password: 'NewPassword123',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = await getJsonResponse(response);
    expect(data.message).toContain('invalid or has expired');
  });

  it('should reject reset-password with weak password', async () => {
    const token = generateToken();
    const user = await createTestUser({
      email: 'weak-reset@example.com',
      password_reset_token: token,
      password_reset_expires_at: new Date(Date.now() + 60 * 60 * 1000),
    });

    const req = createTestRequest('POST', '/api/auth/reset-password', {
      token,
      password: 'weak',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = await getJsonResponse(response);
    expect(data.message).toContain('Password must');
  });

  it('should reject reset-password with too-short token', async () => {
    const req = createTestRequest('POST', '/api/auth/reset-password', {
      token: 'short',
      password: 'NewPassword123',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = await getJsonResponse(response);
    expect(data.message).toContain('invalid or has expired');
  });
});
