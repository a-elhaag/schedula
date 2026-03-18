/**
 * Invite Route Integration Tests
 */

import { POST } from '@/app/api/auth/invite/route';
import { createAuthRequest, getJsonResponse, createTestUser, getAllUsers } from './utils';

describe('POST /api/auth/invite', () => {
  it('should create invite for new user when coordinator', async () => {
    const coordinator = await createTestUser({
      role: 'coordinator',
      email: 'coordinator@example.com',
    });

    const req = createAuthRequest('POST', '/api/auth/invite', coordinator, {
      email: 'newinvite@example.com',
      role: 'student',
      name: 'New Student',
    });

    const response = await POST(req);

    expect(response.status).toBe(201);
    const data = getJsonResponse(response);
    expect(data.ok).toBe(true);
    expect(data.message).toContain('successfully');

    // Check user was created
    const users = await getAllUsers();
    const invitedUser = users.find(u => u.email === 'newinvite@example.com');
    expect(invitedUser).toBeTruthy();
    expect(invitedUser.role).toBe('student');
    expect(invitedUser.invite_token).toBeTruthy();
    expect(invitedUser.invite_status).toBe('pending');
  });

  it('should reject non-coordinator from inviting', async () => {
    const student = await createTestUser({
      role: 'student',
      email: 'student@example.com',
    });

    const req = createAuthRequest('POST', '/api/auth/invite', student, {
      email: 'newinvite2@example.com',
      role: 'student',
    });

    const response = await POST(req);

    expect(response.status).toBe(401);
    const data = getJsonResponse(response);
    expect(data.message).toContain('Coordinator access required');
  });

  it('should reject invite with invalid email', async () => {
    const coordinator = await createTestUser({
      role: 'coordinator',
    });

    const req = createAuthRequest('POST', '/api/auth/invite', coordinator, {
      email: 'invalid-email',
      role: 'student',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = getJsonResponse(response);
    expect(data.message).toContain('valid email');
  });

  it('should reject invite with invalid role', async () => {
    const coordinator = await createTestUser({
      role: 'coordinator',
    });

    const req = createAuthRequest('POST', '/api/auth/invite', coordinator, {
      email: 'newuser@example.com',
      role: 'invalid-role',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = getJsonResponse(response);
    expect(data.message).toContain('valid');
  });

  it('should reject duplicate email invite', async () => {
    const coordinator = await createTestUser({
      role: 'coordinator',
    });

    const existingUser = await createTestUser({
      email: 'existing@example.com',
    });

    const req = createAuthRequest('POST', '/api/auth/invite', coordinator, {
      email: 'existing@example.com',
      role: 'student',
    });

    const response = await POST(req);

    expect(response.status).toBe(409);
    const data = getJsonResponse(response);
    expect(data.message).toContain('already exists');
  });
});
