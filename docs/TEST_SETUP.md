# Test Setup Guide

This project uses containerized services for testing to ensure consistent and reproducible test environments.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 23.6+ (for ES modules support)

## Container Services

The test suite requires the following containerized services:

### PostgreSQL Database

- **Container**: `postgres:15-alpine`
- **Port**: 5433 (test), 5432 (dev)
- **Auto-managed**: Started automatically by Jest global setup

### TigerBeetle Ledger

- **Container**: `ghcr.io/tigerbeetle/tigerbeetle:0.16.44`
- **Port**: 6001 (test), 6000 (dev)
- **Manual start required**: Must be started before running tests

## Running Tests

### 1. Start TigerBeetle Container

Before running any tests, start the TigerBeetle container:

```bash
# Start TigerBeetle test container
npm run docker:tigerbeetle:up

# Or start all test containers
npm run docker:test:up
```

### 2. Run Tests

Once containers are running:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage
```

### 3. Stop Containers

After testing:

```bash
# Stop TigerBeetle only
npm run docker:tigerbeetle:down

# Stop all test containers
npm run docker:test:down
```

## Container Commands

| Command                           | Description                                     |
| --------------------------------- | ----------------------------------------------- |
| `npm run docker:test:up`          | Start PostgreSQL + TigerBeetle test containers  |
| `npm run docker:test:down`        | Stop all test containers                        |
| `npm run docker:tigerbeetle:up`   | Start TigerBeetle test container only           |
| `npm run docker:tigerbeetle:down` | Stop TigerBeetle test container only            |
| `npm run docker:dev:up`           | Start development containers (ports 5432, 6000) |
| `npm run docker:dev:down`         | Stop development containers                     |

## Test Architecture

- **Database**: PostgreSQL container managed automatically by Jest setup
- **TigerBeetle**: External container on port 6001 for testing
- **No Local Binaries**: All services run in containers for consistency
- **ES Modules**: Uses `tsx` for TypeScript execution with ES module support

## Troubleshooting

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

If you encounter port conflicts, check for existing services:

```bash
# Check what's using ports 6001, 5433
lsof -i :6001
lsof -i :5433
```

### Container Cleanup

```bash
# Full cleanup
docker-compose -f docker-compose.test.yml down -v
docker system prune -f
```
