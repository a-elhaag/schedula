# Testing Guide

This directory contains comprehensive test suites for the Schedula backend services and API routes.

## Test Structure

```
tests/
├── __mocks__/
│   └── db.js                              # MongoDB mock helpers
├── lib/server/
│   ├── auth.test.js                       # Auth utility tests
│   ├── studentScheduleService.test.js     # Student schedule service tests
│   └── coordinatorService.test.js         # Coordinator service tests
├── app/api/
│   ├── student/
│   │   └── schedule.test.js               # Student schedule API route tests
│   └── coordinator.test.js                # Coordinator API route tests
├── setup.js                               # Jest configuration and global mocks
└── README.md                              # This file
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (re-run on file changes)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run specific test file
pnpm test auth.test.js

# Run tests matching a pattern
pnpm test --testNamePattern="should fetch"
```

## Test Coverage

Current test coverage:

- **Auth Utility**: User extraction, error handling
- **Student Schedule Service**: Fetching, filtering by day/course/instructor, pagination, sorting
- **Coordinator Service**: Courses, rooms, staff fetching with pagination and filters
- **API Routes**: Parameter parsing, response formatting, error handling, status codes

## Key Testing Patterns

### Mocking MongoDB

```javascript
const mockCollection = mockCollection("courses");
mockCollection.find.mockReturnThis();
mockCollection.sort.mockReturnThis();
mockCollection.toArray.mockResolvedValue([...data]);

const mockDb = mockDb();
mockDb.collection.mockReturnValue(mockCollection);
getDb.mockResolvedValue(mockDb);
```

### Testing Async Functions

```javascript
it("should fetch data", async () => {
  const result = await getStudentSchedule({...});
  expect(result).toEqual({...});
});
```

### Testing Error Handling

```javascript
it("should throw for invalid ID", async () => {
  await expect(
    getStudentSchedule({ institutionId: "invalid" })
  ).rejects.toThrow("Invalid institutionId");
});
```

## Adding New Tests

When adding new services or API routes:

1. Create corresponding `.test.js` file in `tests/` with same directory structure as source
2. Mock external dependencies (getDb, getCurrentUser, etc.)
3. Test both success and failure paths
4. Test parameter validation and edge cases
5. Test pagination and filtering logic
6. Verify correct error status codes

Example test template:

```javascript
import { myFunction } from "@/lib/server/myModule";
import { getDb } from "@/lib/db";
import { mockDb, resetMocks } from "../../__mocks__/db";

jest.mock("@/lib/db");

describe("My Module", () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  it("should do something", async () => {
    const mockDbInstance = mockDb();
    // ... setup mocks
    getDb.mockResolvedValue(mockDbInstance);

    const result = await myFunction({...});

    expect(result).toEqual({...});
  });

  it("should handle errors", async () => {
    // ...test error case
  });
});
```

## Notes

- Tests use Jest mocks to avoid real database calls
- MongoDB ObjectId validation is mocked to accept any string for testing
- NextResponse is mocked to return simple objects with json() method
- All async operations must use `await` and use jest.fn() for mocks
