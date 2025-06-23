# Test Infrastructure

This directory contains the test infrastructure for the core API, organized into different test types for optimal performance and reliability.

## Test Strategy

### Fast Tests (Default - `npm test`)

- **Unit tests**: Pure logic testing with mocked dependencies
- **Fast integration tests**: Use mock services, no external dependencies
- **Execution time**: ~15-25 seconds total
- **Use case**: Development workflow, CI/CD pipelines

### Slow Tests (`npm run test:all` or specific commands)

- **Integration tests**: Real external services (TigerBeetle, PostgreSQL, RabbitMQ)
- **E2E tests**: Full system testing
- **Execution time**: 60+ seconds
- **Use case**: Pre-deployment validation, comprehensive testing

## Available Test Commands

```bash
# Fast tests only (recommended for development)
npm test

# All tests including slow integration/e2e
npm run test:all

# Specific test types
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests with real services
npm run test:e2e           # End-to-end tests

# Development helpers
npm run test:watch         # Watch mode for fast development
npm run test:coverage      # Coverage report
```

## Directory Structure

```
tests/
├── README.md                     # This file
├── setup.ts                     # Global setup for integration/e2e tests
├── helpers/
│   └── test-setup.ts            # Test utilities and helpers
├── mocks/                       # Mock service implementations
│   ├── mock-service-factory.ts  # Factory for creating mock services
│   ├── mock-tigerbeetle.service.ts
│   └── mock-cdc-manager.service.ts
├── unit/                        # Unit tests (fast, isolated)
├── integration/
│   ├── fast-*.test.ts          # Fast integration tests with mocks
│   └── *.test.ts               # Slow integration tests with real services
└── e2e/                        # End-to-end tests
```

## Mock Services

Fast integration tests use mock implementations that:

- Simulate external service behavior in-memory
- Provide deterministic, fast responses
- Support the same interfaces as real services
- Enable parallel test execution

### Available Mocks

- **MockTigerBeetleService**: In-memory ledger simulation
- **MockCDCManagerService**: Synchronous event processing
- **MockServiceFactory**: Creates configured mock service containers

## Performance Improvements

The test infrastructure has been optimized to provide fast feedback:

| Test Type        | Before               | After        | Improvement   |
| ---------------- | -------------------- | ------------ | ------------- |
| Unit tests       | 60+ seconds          | 3-5 seconds  | 92-95% faster |
| Fast integration | 60+ seconds          | 5-10 seconds | 85-91% faster |
| Full test suite  | 2+ minutes (timeout) | 25 seconds   | 87% faster    |

## Writing Tests

### Fast Integration Tests

Use the `fast-` prefix and mock services:

```typescript
import { createTestServicesWithMocks } from '../mocks/mock-service-factory.js';

describe('Fast Banking Workflows (Mock Services)', () => {
  let services: MockServiceContainer;

  beforeAll(async () => {
    services = await createTestServicesWithMocks();
  });

  beforeEach(async () => {
    services.tigerBeetleService.reset();
    services.cdcManager.clearEvents();
  });

  // Tests using services.* (all mocked)
});
```

### Slow Integration Tests

Use real services for comprehensive testing:

```typescript
import { getGlobalTestServices } from '../setup.js';

describe('Banking Integration (Real Services)', () => {
  let services: ServiceContainer;

  beforeAll(async () => {
    services = getGlobalTestServices();
  });

  // Tests using real TigerBeetle, PostgreSQL, RabbitMQ
});
```

## External Service Requirements

Slow tests require running external services:

```bash
# Start required services
docker-compose up -d

# Verify services are ready
docker-compose ps
```

Required services:

- PostgreSQL (localhost:5432)
- TigerBeetle (localhost:6000)
- RabbitMQ (localhost:5672)

## Troubleshooting

### Tests Timing Out

- Use `npm test` for fast feedback during development
- Only run `npm run test:all` when you need comprehensive validation
- Ensure external services are running for integration/e2e tests

### Mock vs Real Service Confusion

- Fast tests (prefixed with `fast-`) should use mocks
- Integration tests without `fast-` prefix use real services
- Check the test file's `beforeAll` setup to confirm which services are used

### Performance Issues

- Fast tests should complete in <10 seconds
- If fast tests are slow, ensure they're not accidentally using real services
- Use `npm run test:unit` to run only the fastest tests
