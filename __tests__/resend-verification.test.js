/**
 * Resend Verification Route Integration Tests
 */

import { POST } from '@/app/api/auth/resend-verification/route';
import { createTestRequest, getJsonResponse, createTestUser, getAllUsers } from './utils';

describe('POST /api/auth/resend-verification', () => {
  it('should resend verification email to unverified user', async () => {
    const user = await createTestUser({
      email: 'unverified@example.com',
      email_verified_at: null,
      email_verify_token: 'old-token-value',
      invite_status: 'pending',
    });

    const req = createTestRequest('POST', '/api/auth/resend-verification', {
      email: 'unverified@example.com',
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
    const data = await getJsonResponse(response);
    expect(data.ok).toBe(true);
    expect(data.message).toContain('verification link');

    // Check new token was generated
    const users = await getAllUsers();
    const updatedUser = users.find(u => u._id.equals(user._id));
    expect(updatedUser.email_verify_token).not.toBe('old-token-value');
  });

  it('should return generic message for verified user', async () => {
    const user = await createTestUser({
      email: 'verified@example.com',
      email_verified_at: new Date(),
      invite_status: 'joined',
    });

    const req = createTestRequest('POST', '/api/auth/resend-verification', {
      email: 'verified@example.com',
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
    const data = await getJsonResponse(response);
    expect(data.message).toContain('verification link');
  });

  it('should reject invalid email format', async () => {
    const req = createTestRequest('POST', '/api/auth/resend-verification', {
      email: 'invalid-email',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = await getJsonResponse(response);
    expect(data.message).toContain('valid email');
  });

  it('should not expose user existence', async () => {
    const user = await createTestUser({
      email: 'exists2@example.com',
      email_verified_at: null,
    });

    const req1 = createTestRequest('POST', '/api/auth/resend-verification', {
      email: 'exists2@example.com',
    });
    const res1 = await POST(req1);

    const req2 = createTestRequest('POST', '/api/auth/resend-verification', {
      email: 'notexists2@example.com',
    });
    const res2 = await POST(req2);

    // Both should return same message
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect((await getJsonResponse(res1)).message).toBe((await getJsonResponse(res2)).message);
  });
});
