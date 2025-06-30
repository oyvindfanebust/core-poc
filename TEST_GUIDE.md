# Test Guide

This guide covers all aspects of testing in the Banking Ledger POC, including test setup, running tests, and troubleshooting.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 23.6+ (for ES modules support)

## Test Infrastructure

The test suite uses containerized services to ensure consistent and reproducible test environments.

### Required Services

| Service     | Container                                 | Test Port | Dev Port | Management            |
| ----------- | ----------------------------------------- | --------- | -------- | --------------------- |
| PostgreSQL  | `postgres:15-alpine`                      | 5433      | 5432     | Auto-managed by Jest  |
| TigerBeetle | `ghcr.io/tigerbeetle/tigerbeetle:0.16.44` | 6001      | 6000     | Manual start required |
| RabbitMQ    | Included in docker-compose                | Default   | Default  | Manual start required |

### Backend Services

| Service         | Port | Description              |
| --------------- | ---- | ------------------------ |
| Core API        | 7001 | Main backend API         |
| Batch Processor | 7003 | Background job processor |

## Quick Start

### Running All Tests

```bash
# 1. Start infrastructure services (PostgreSQL, TigerBeetle, RabbitMQ)
docker-compose up -d

# 2. Start backend services (Core API and Batch Processor)
npm run dev:backend &

# 3. Wait for services to be ready
sleep 10

# 4. Run all tests
npm test

# 5. Stop backend services when done
pkill -f "npm run dev:backend"
```

### Running Tests Without Backend Services

For tests that don't require backend services:

```bash
# Run only unit tests
npm test -- --selectProjects unit

# Run tests in specific packages
npm test --workspace=@core-poc/core-services
npm test --workspace=@core-poc/shared
npm test --workspace=@core-poc/domain
```

## Test Categories

### 1. Unit Tests

- **Location**: `*/tests/unit/**/*.test.ts`
- **Requirements**: None (can run standalone)
- **Command**: `npm run test:unit`

### 2. Fast Integration Tests

- **Location**: `*/tests/integration/fast-*.test.ts`
- **Requirements**:
  - System accounts tests require Core API (port 7001)
  - Other fast tests use mocks
- **Command**: `npm test -- --testNamePattern="fast-"`

### 3. Integration Tests

- **Location**: `*/tests/integration/*.test.ts` (non-fast)
- **Requirements**: Full infrastructure (PostgreSQL, TigerBeetle, RabbitMQ)
- **Command**: `npm run test:integration`

### 4. End-to-End Tests

- **Location**: `*/tests/e2e/**/*.test.ts`
- **Requirements**: All services running
- **Command**: `npm run test:e2e`

## Container Management

### Test Container Commands

| Command                           | Description                                    |
| --------------------------------- | ---------------------------------------------- |
| `npm run docker:test:up`          | Start PostgreSQL + TigerBeetle test containers |
| `npm run docker:test:down`        | Stop all test containers                       |
| `npm run docker:tigerbeetle:up`   | Start TigerBeetle test container only          |
| `npm run docker:tigerbeetle:down` | Stop TigerBeetle test container only           |
| `npm run docker:dev:up`           | Start development containers                   |
| `npm run docker:dev:down`         | Stop development containers                    |

### Manual Container Management

```bash
# Start specific test containers
npm run docker:tigerbeetle:up

# Or start all test containers
npm run docker:test:up

# Check container status
docker-compose -f docker-compose.test.yml ps

# View container logs
docker-compose -f docker-compose.test.yml logs -f
```

## Test Architecture

- **Database**: PostgreSQL container managed automatically by Jest global setup
- **TigerBeetle**: External container on port 6001 for testing
- **No Local Binaries**: All services run in containers for consistency
- **ES Modules**: Uses `tsx` for TypeScript execution with ES module support

## Troubleshooting

### Service Health Checks

```bash
# Check if backend services are running
curl http://localhost:7001/health

# Check infrastructure status
docker-compose ps
```

### TigerBeetle Connection Issues

```bash
# Check if container is running
docker-compose -f docker-compose.test.yml ps

# Check container logs
docker-compose -f docker-compose.test.yml logs tigerbeetle-test

# Restart container if needed
npm run docker:tigerbeetle:down
npm run docker:tigerbeetle:up
```

### Port Conflicts

```bash
# Check what's using test ports
lsof -i :6001  # TigerBeetle test port
lsof -i :5433  # PostgreSQL test port
lsof -i :7001  # Core API port
lsof -i :7003  # Batch Processor port
```

### Container Cleanup

```bash
# Stop all containers
docker-compose down
docker-compose -f docker-compose.test.yml down

# Full cleanup (including volumes)
docker-compose down -v
docker-compose -f docker-compose.test.yml down -v
docker system prune -f
```

## CI/CD Recommendations

For CI/CD pipelines, start services as part of the test job:

```yaml
- name: Start Infrastructure
  run: docker-compose up -d

- name: Start Backend Services
  run: |
    npm run dev:backend &
    sleep 10

- name: Run Tests
  run: npm test

- name: Stop Services
  run: |
    pkill -f "npm run dev:backend" || true
    docker-compose down
```

## Coverage Reports

```bash
# Run tests with coverage
npm run test:coverage

# Coverage will be generated in ./coverage directory
```

## Best Practices

1. **Always start required services** before running integration tests
2. **Use specific test commands** when working on isolated features
3. **Clean up containers** after testing to free resources
4. **Check service health** if tests fail unexpectedly
5. **Use test containers** for consistency across environments
