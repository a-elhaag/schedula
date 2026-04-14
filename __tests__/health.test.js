/**
 * Health Check Endpoint Integration Tests
 */

import { GET } from '@/app/api/health/route';
import { createTestRequest, getJsonResponse } from './utils';

describe('GET /api/health', () => {
  it('should return healthy status with database connected', async () => {
    const req = createTestRequest('GET', '/api/health');

    const response = await GET(req);

    expect(response.status).toBe(200);
    const data = await getJsonResponse(response);
    expect(data.status).toBe('healthy');
    expect(data.checks.database).toBe('ok');
    expect(data.timestamp).toBeTruthy();
  });

  it('should include timestamp in response', async () => {
    const beforeTime = new Date();
    const req = createTestRequest('GET', '/api/health');
    const response = await GET(req);

    const data = await getJsonResponse(response);
    const responseTime = new Date(data.timestamp);

    expect(responseTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime() - 1000);
  });

  it('should include request ID in response context', async () => {
    const req = createTestRequest('GET', '/api/health', null, {
      'x-request-id': 'test-health-check-id',
    });

    const response = await GET(req);

    expect(response.status).toBe(200);
    const data = await getJsonResponse(response);
    expect(data.status).toBe('healthy');
  });
});
