/**
 * Forgot Password Route Integration Tests
 */

import { POST } from '@/app/api/auth/forgot-password/route';
import { createTestRequest, getJsonResponse, createTestUser, getAllUsers } from './utils';

describe('POST /api/auth/forgot-password', () => {
  it('should generate reset token for existing user', async () => {
    const user = await createTestUser({
      email: 'reset@example.com',
    });

    const req = createTestRequest('POST', '/api/auth/forgot-password', {
      email: 'reset@example.com',
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
    const data = getJsonResponse(response);
    expect(data.ok).toBe(true);
    expect(data.message).toContain('password reset link');

    // Check token was created
    const users = await getAllUsers();
    const updatedUser = users.find(u => u._id.equals(user._id));
    expect(updatedUser.password_reset_token).toBeTruthy();
    expect(updatedUser.password_reset_expires_at).toBeTruthy();
  });

  it('should return generic message for non-existent user', async () => {
    const req = createTestRequest('POST', '/api/auth/forgot-password', {
      email: 'nonexistent@example.com',
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
    const data = getJsonResponse(response);
    expect(data.message).toContain('password reset link');
  });

  it('should reject invalid email format', async () => {
    const req = createTestRequest('POST', '/api/auth/forgot-password', {
      email: 'invalid-email',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = getJsonResponse(response);
    expect(data.message).toContain('valid email');
  });

  it('should not expose user existence', async () => {
    // Existing user
    await createTestUser({ email: 'exists@example.com' });

    const req1 = createTestRequest('POST', '/api/auth/forgot-password', {
      email: 'exists@example.com',
    });
    const res1 = await POST(req1);

    const req2 = createTestRequest('POST', '/api/auth/forgot-password', {
      email: 'notexists@example.com',
    });
    const res2 = await POST(req2);

    // Both should return same message
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(getJsonResponse(res1).message).toBe(getJsonResponse(res2).message);
  });
});
