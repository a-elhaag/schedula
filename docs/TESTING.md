# Testing Guide

Comprehensive guide for running and maintaining tests in the Schedula authentication system.

## Overview

The test suite uses **Jest** with **mongodb-memory-server** for integration testing, providing a fast, isolated test environment without requiring an external MongoDB instance.

### Test Stack
- **Test Runner**: Jest 30.3.0
- **Test Database**: MongoDB Memory Server 11.0.1
- **HTTP Mocking**: node-mocks-http 1.17.2
- **Test Environment**: Node.js

---

## Running Tests

### Run All Tests
```bash
pnpm test
```

### Watch Mode (Re-runs on file changes)
```bash
pnpm test:watch
```

### Coverage Report
```bash
pnpm test:coverage
```

### Run Specific Test File
```bash
pnpm test signin.test.js
```

### Run Tests Matching Pattern
```bash
pnpm test --testNamePattern="should sign in user"
```

---

## Test Structure

### Test Files Located
All test files are in the `__tests__/` directory:
- `__tests__/utils.js` - Shared test utilities and helpers
- `__tests__/signin.test.js` - Sign in endpoint tests
- `__tests__/signup.test.js` - Sign up endpoint tests
- `__tests__/verify-email.test.js` - Email verification tests
- `__tests__/forgot-password.test.js` - Password reset request tests
- `__tests__/resend-verification.test.js` - Resend email verification tests
- `__tests__/invite.test.js` - User invitation tests
- `__tests__/accept-invite.test.js` - Invite acceptance tests
- `__tests__/reset-password.test.js` - Password reset completion tests
- `__tests__/health.test.js` - Health check endpoint tests

### Configuration Files
- `jest.config.js` - Jest configuration
- `jest.setup.js` - Test environment setup (MongoDB Memory Server)

---

## Test Utilities

### Helper Functions (in `__tests__/utils.js`)

#### `createTestUser(userData)`
Creates a user in the test database.
```javascript
const user = await createTestUser({
  email: 'test@example.com',
  role: 'student',
  email_verified_at: new Date(),
});
```

#### `createAuthRequest(method, url, user, body)`
Creates an authenticated HTTP request with JWT token.
```javascript
const req = createAuthRequest('POST', '/api/auth/invite', coordinator, {
  email: 'newuser@example.com',
  role: 'student',
});
```

#### `createTestRequest(method, url, body, headers)`
Creates a basic HTTP request without authentication.
```javascript
const req = createTestRequest('POST', '/api/auth/signin', {
  email: 'test@example.com',
  password: 'Password123',
});
```

#### `createTestResponse()`
Creates a mock HTTP response object.
```javascript
const res = createTestResponse();
```

#### `getJsonResponse(res)`
Extracts JSON from response object.
```javascript
const data = getJsonResponse(response);
expect(data.ok).toBe(true);
```

#### `getAllUsers()`
Retrieves all users from test database.
```javascript
const users = await getAllUsers();
const testUser = users.find(u => u.email === 'test@example.com');
```

#### `clearDatabase()`
Clears all test data from database.
```javascript
await clearDatabase();
```

---

## Test Coverage by Endpoint

### Sign In (`POST /api/auth/signin`) - 6 Tests
- ✅ Valid credentials
- ✅ Invalid email format
- ✅ Missing password
- ✅ Non-existent user
- ✅ Wrong password
- ✅ Unverified email

### Sign Up (`POST /api/auth/signup`) - 6 Tests
- ✅ Valid user creation
- ✅ Invalid email format
- ✅ Short name
- ✅ Weak password
- ✅ Duplicate email
- ✅ Verification token stored

### Email Verification (`POST /api/auth/verify-email`) - 4 Tests
- ✅ Valid token verification
- ✅ Invalid token rejection
- ✅ Expired token rejection
- ✅ Too-short token rejection

### Forgot Password (`POST /api/auth/forgot-password`) - 4 Tests
- ✅ Reset token generation
- ✅ Generic message for non-existent user (security)
- ✅ Invalid email format rejection
- ✅ User existence not exposed

### Resend Verification (`POST /api/auth/resend-verification`) - 4 Tests
- ✅ Email resend for unverified users
- ✅ Generic message for verified users
- ✅ Invalid email rejection
- ✅ User existence not exposed

### Invite (`POST /api/auth/invite`) - 5 Tests
- ✅ Invite creation by coordinator
- ✅ Non-coordinator rejection
- ✅ Invalid email rejection
- ✅ Invalid role rejection
- ✅ Duplicate email rejection

### Accept Invite (`POST /api/auth/accept-invite`) - 5 Tests
- ✅ Valid invite acceptance
- ✅ Invalid token rejection
- ✅ Expired token rejection
- ✅ Email mismatch detection
- ✅ Weak password rejection

### Reset Password (`POST /api/auth/reset-password`) - 5 Tests
- ✅ Password reset with valid token
- ✅ Invalid token rejection
- ✅ Expired token rejection
- ✅ Weak password rejection
- ✅ Too-short token rejection

### Health Check (`GET /api/health`) - 3 Tests
- ✅ Healthy status with DB connected
- ✅ Timestamp included
- ✅ Request ID handled

**Total: 42 Integration Tests**

---

## Database Setup for Tests

### In-Memory MongoDB
- **Location**: Configured in `jest.setup.js`
- **Database Name**: `schedula-test`
- **Lifecycle**:
  1. **beforeAll**: Starts MongoDB Memory Server, sets MONGODB_URI env var
  2. **afterEach**: Clears all collections after each test
  3. **afterAll**: Stops MongoDB Memory Server

### Advantages
- No external database required
- Tests run in isolation
- Fast execution (~30-50ms per test)
- Automatic cleanup
- No test data pollution

---

## Writing New Tests

### Test Template
```javascript
import { POST } from '@/app/api/auth/endpoint/route';
import { createTestRequest, getJsonResponse, createTestUser } from './utils';

describe('POST /api/auth/endpoint', () => {
  it('should describe what is being tested', async () => {
    // Arrange: Set up test data
    const user = await createTestUser({ email: 'test@example.com' });

    // Act: Execute the test
    const req = createTestRequest('POST', '/api/auth/endpoint', {
      email: 'test@example.com',
      password: 'TestPassword123',
    });
    const response = await POST(req);

    // Assert: Verify results
    expect(response.status).toBe(200);
    const data = getJsonResponse(response);
    expect(data.ok).toBe(true);
  });
});
```

### Best Practices
1. **One assertion per test** or closely related assertions
2. **Use descriptive test names** that explain what is being tested
3. **Follow AAA pattern** (Arrange, Act, Assert)
4. **Test both success and failure cases**
5. **Clean up test data** (automatic via jest.setup.js)
6. **Mock external services** (email is currently mocked in development mode)

---

## Continuous Integration

### CI/CD Integration
Add to your CI pipeline:
```bash
pnpm install
pnpm lint
pnpm test --coverage --forceExit
```

### Coverage Thresholds
Recommended coverage targets:
- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

Update `jest.config.js` to enforce:
```javascript
coverageThreshold: {
  global: {
    branches: 75,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

---

## Troubleshooting

### Tests Timeout
**Problem**: Tests running longer than 30 seconds
**Solution**: Increase timeout in `jest.config.js`
```javascript
testTimeout: 60000, // 60 seconds
```

### MongoDB Memory Server Issues
**Problem**: "Could not download MongoDB binary"
**Solution**:
1. Check internet connection
2. Clear npm cache: `pnpm cache clean`
3. Set custom download path:
```bash
MONGOMS_DOWNLOAD_URL=https://... pnpm test
```

### Port Conflicts
**Problem**: "Port already in use"
**Solution**: Kill existing processes or increase delay in jest.setup.js

### Flaky Tests
**Problem**: Tests pass/fail intermittently
**Solution**:
1. Add retry logic: `jest.retryTimes(3)`
2. Increase timeouts
3. Check for async operations not awaited
4. Ensure cleanup in afterEach

---

## Performance Metrics

### Test Execution Time
- **Single Test**: ~10-50ms
- **Full Suite (42 tests)**: ~30-60 seconds
- **First Run**: ~20-30 seconds (includes MongoDB download)
- **Subsequent Runs**: ~15-20 seconds

### Memory Usage
- **Idle**: ~100MB
- **During Tests**: ~300-400MB
- **Peak**: ~500MB

---

## Future Enhancements

- [ ] Add E2E tests with Playwright
- [ ] Add performance benchmarks
- [ ] Add visual regression tests
- [ ] Increase coverage to 90%+
- [ ] Add load testing suite
- [ ] Integration with CI/CD (GitHub Actions)
- [ ] Coverage badges in README

---

## References

- [Jest Documentation](https://jestjs.io/)
- [MongoDB Memory Server](https://github.com/typegoose/mongodb-memory-server)
- [node-mocks-http](https://github.com/howardabrams/node-mocks-http)
- [Testing Best Practices](https://testingjavascript.com/)
