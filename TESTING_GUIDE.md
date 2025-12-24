# Testing Guide - Lead Routing System

## Overview

This document describes the testing infrastructure and best practices for the Lead Routing System.

---

## Test Structure

### Test Types

1. **Unit Tests** (`.test.ts`)
   - Test individual functions/classes in isolation
   - Fast execution
   - No external dependencies
   - Example: `errors.test.ts`, `logger.test.ts`

2. **Integration Tests** (`.spec.ts`)
   - Test API endpoints and modules working together
   - Use Supertest for HTTP testing
   - May use database (test DB)
   - Example: `health.spec.ts`, `routing.spec.ts`

3. **E2E Tests** (future - Playwright)
   - Test complete user workflows
   - Test UI interactions
   - Slowest but most comprehensive

---

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

---

## Test Configuration

### Jest Configuration
See `jest.config.js` for full configuration.

Key settings:
- **Preset:** `ts-jest` (TypeScript support)
- **Test Environment:** `node`
- **Coverage Threshold:** 60% (branches, functions, lines, statements)
- **Test Match:** `**/*.test.ts` and `**/*.spec.ts`

### Environment Variables
Test environment variables are set in `jest.setup.ts`:
- `NODE_ENV=test`
- `DATABASE_URL=file:./prisma/test.db`
- `MONDAY_USE_MOCK=true`
- `LOG_LEVEL=error` (suppress logs during tests)

---

## Monday.com Mock Client

### Usage

```typescript
import { MockMondayClient, mockData } from "@/packages/modules/monday-integration/src/__mocks__/monday.client.mock";

describe("My Test", () => {
  let client: MockMondayClient;

  beforeEach(() => {
    client = new MockMondayClient();
  });

  it("should fetch boards", async () => {
    const response = await client.query("query { boards }");
    expect(response.data.boards).toBeDefined();
  });
});
```

### Mock Data

The mock client provides:
- **2 boards** (`board_123` - Leads, `board_456` - Deals)
- **2 items** (sample leads)
- **3 users** (Alice, Bob, Carol)

Access mock data directly:
```typescript
import { mockData } from "@/packages/modules/monday-integration/src/__mocks__/monday.client.mock";

console.log(mockData.boards); // Array of boards
console.log(mockData.items);  // Array of items
console.log(mockData.users);  // Array of users
```

### Simulating Failures

```typescript
client.setNextCallFails("API rate limit exceeded");
await expect(client.query("query { boards }")).rejects.toThrow();
```

### Tracking Calls

```typescript
expect(client.getCallCount()).toBe(0);
await client.query("query { boards }");
expect(client.getCallCount()).toBe(1);
```

---

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from "@jest/globals";
import { myFunction } from "../myModule";

describe("myFunction", () => {
  it("should return expected result", () => {
    const result = myFunction("input");
    expect(result).toBe("expected output");
  });

  it("should throw error on invalid input", () => {
    expect(() => myFunction(null)).toThrow("Invalid input");
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeAll } from "@jest/globals";
import request from "supertest";
import { createServer } from "../server";

describe("POST /api/endpoint", () => {
  let app;

  beforeAll(() => {
    app = createServer();
  });

  it("should return 200 with valid data", async () => {
    const response = await request(app)
      .post("/api/endpoint")
      .send({ data: "test" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("result");
  });
});
```

---

## Best Practices

### 1. Test Naming
- Use descriptive test names
- Follow pattern: "should [expected behavior] when [condition]"
- Example: `it("should return 404 when resource not found")`

### 2. Arrange-Act-Assert (AAA)
```typescript
it("should calculate total correctly", () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(30);
});
```

### 3. Test Isolation
- Each test should be independent
- Use `beforeEach` to reset state
- Don't rely on test execution order

### 4. Mock External Dependencies
- Always mock Monday.com API
- Mock database when possible
- Mock time-dependent functions

### 5. Test Edge Cases
- Null/undefined inputs
- Empty arrays/objects
- Boundary values
- Error conditions

---

## Coverage Goals

### Current Thresholds
- Branches: 60%
- Functions: 60%
- Lines: 60%
- Statements: 60%

### Priority Areas
1. **Core Logic** (80%+ coverage)
   - Rule Engine
   - Decision Engine
   - Metrics calculations

2. **API Endpoints** (70%+ coverage)
   - Routing endpoints
   - Admin endpoints
   - Manager endpoints

3. **Utilities** (60%+ coverage)
   - Error handling
   - Validation
   - Logging

---

## Continuous Integration

### Pre-commit Checks
```bash
npm run typecheck  # TypeScript compilation
npm test           # Run all tests
```

### CI Pipeline (future)
1. Install dependencies
2. Run linter
3. Run type checking
4. Run tests with coverage
5. Upload coverage report
6. Build application

---

## Debugging Tests

### Run Single Test File
```bash
npx jest path/to/test.test.ts
```

### Run Single Test
```bash
npx jest -t "test name"
```

### Debug with VSCode
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

---

## Common Issues

### Issue: Tests timeout
**Solution:** Increase timeout in `jest.config.js` or specific test:
```typescript
jest.setTimeout(60000); // 60 seconds
```

### Issue: Database locked
**Solution:** Use separate test database:
```bash
DATABASE_URL=file:./prisma/test.db npm test
```

### Issue: Mock not working
**Solution:** Ensure mock is imported before the module being tested:
```typescript
jest.mock("../monday.client");
import { myFunction } from "../myModule";
```

---

## Next Steps

1. ✅ Jest + ts-jest setup complete
2. ✅ Mock Monday.com client created
3. ✅ Sample unit tests written
4. ✅ Sample integration tests written
5. ⏳ TODO: Add more unit tests for Rule Engine
6. ⏳ TODO: Add integration tests for Routing endpoints
7. ⏳ TODO: Setup Playwright for E2E tests
8. ⏳ TODO: Integrate with CI/CD pipeline

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)

---

**Last Updated:** December 24, 2025  
**Status:** Testing infrastructure ready for development

