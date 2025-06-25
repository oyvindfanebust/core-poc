# Development Guide

This document covers development workflows, testing strategies, and technical implementation details.

## Development Workflow

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- TigerBeetle database (for accounting ledger)
- direnv (for environment variable management)

### Local Development Setup

```bash
# Clone and install dependencies
git clone <repository-url>
cd core-poc
npm install

# Set up environment variables
cp .envrc.example .envrc
# Edit .envrc with your configuration
direnv allow

# Start infrastructure
docker-compose up -d

# Start development servers
npm run dev:all  # All services
# OR
npm run dev:backend   # Backend only
npm run dev:frontend  # Frontend only
```

## Testing Strategy

### Test Structure

**Unit Tests:**

- Domain logic testing
- Value object validation
- Service layer testing
- Isolated component testing

**Integration Tests:**

- Database interactions
- Repository layer testing
- Service integration
- API endpoint testing

**End-to-End Tests:**

- Complete workflow testing
- Real TigerBeetle integration
- Full API scenarios

### Running Tests

```bash
# Fast tests (unit + fast integration)
npm test

# Full test suite including slow integration tests
npm run test:all

# Specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Test with coverage reporting
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Data

**Standard Test Customer:**

- Customer ID: `CUSTOMER-ABC-123`
- Use consistently across all tests
- Ensures reproducible test scenarios

## Database Management

### Migrations

The application uses an automated migration system that runs on startup:

```typescript
// Migrations run automatically on startup
// To add new migrations, edit src/database/migrations.ts

// Manual migration management (if needed)
const migrationRunner = new MigrationRunner(db);
await migrationRunner.runMigrations();
await migrationRunner.rollbackMigration('migration_id');
```

### Database Schema

**PostgreSQL (Metadata Only):**

- Customer information
- Account metadata
- User authentication data
- Configuration settings
- Migration tracking

**TigerBeetle (Financial Data):**

- Account balances
- Transaction records
- Transfer history
- Financial audit trails

### Connection Management

- Connection pooling for PostgreSQL
- Automatic reconnection handling
- Graceful shutdown procedures
- Health check integration

## Background Jobs

### Job Scheduling

**Development Environment:**

- Payment processing: Every 30 seconds
- Invoice processing: Every 60 seconds
- Quick feedback for development

**Production Environment:**

- Payment processing: Monthly schedule
- Invoice processing: Daily schedule
- Optimized for production workloads

### Job Implementation

```typescript
interface BackgroundJob {
  name: string;
  schedule: string;
  execute(): Promise<void>;
}

// Example job implementation
class PaymentPlanJob implements BackgroundJob {
  name = 'payment-plan-processing';
  schedule = process.env.NODE_ENV === 'development' ? '*/30 * * * * *' : '0 0 1 * *';

  async execute(): Promise<void> {
    // Job implementation
  }
}
```

### Error Handling

- Comprehensive error logging
- Retry mechanisms for failed jobs
- Dead letter queues for problematic jobs
- Monitoring and alerting integration

## Code Quality

### TypeScript Configuration

**Strict Mode Enabled:**

- No implicit any types
- Strict null checks
- Unused variable detection
- Comprehensive type checking

### Linting and Formatting

```bash
# ESLint validation
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Prettier formatting
npm run format

# Check formatting without changes
npm run format:check
```

### Pre-commit Hooks

Automated quality checks before commits:

- TypeScript compilation
- ESLint validation
- Test execution
- Code formatting

## Build and Deployment

### Build Process

```bash
# Build all workspaces
npm run build

# Build specific workspace
npm run build:backend
npm run build:frontend
```

### Production Build

**Backend Services:**

- TypeScript compilation to JavaScript
- Dependency optimization
- Environment-specific configuration

**Frontend Application:**

- Next.js production build
- Static asset optimization
- Internationalization support

## Debugging

### Development Tools

**Backend Debugging:**

- Winston structured logging
- Request/response logging
- Correlation ID tracking
- Performance timing

**Frontend Debugging:**

- Next.js development tools
- React Developer Tools
- Network request inspection
- State management debugging

### Log Levels

- **error**: Critical errors requiring attention
- **warn**: Warning conditions
- **info**: General operational information
- **debug**: Detailed debugging information

## Performance Considerations

### Database Optimization

- Indexed queries for frequently accessed data
- Connection pooling for efficient resource usage
- Query optimization and analysis
- Database performance monitoring

### Memory Management

- Monitoring memory usage patterns
- Garbage collection optimization
- Resource cleanup in background jobs
- Memory leak detection

### Caching Strategy

- In-memory caching for frequently accessed data
- Redis integration ready for implementation
- Cache invalidation strategies
- Performance metric tracking

## API Development

### Request/Response Flow

1. **Input Validation**: Zod schema validation
2. **Authentication**: User verification (when implemented)
3. **Authorization**: Permission checking
4. **Business Logic**: Service layer processing
5. **Data Access**: Repository layer operations
6. **Response**: Structured JSON response

### Error Handling

**Structured Error Responses:**

```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### Validation

**Zod Schema Examples:**

```typescript
const CreateAccountSchema = z.object({
  type: z.enum(['DEPOSIT', 'LOAN', 'CREDIT']),
  customerId: z
    .string()
    .regex(/^[A-Za-z0-9\-_]+$/)
    .min(1)
    .max(50),
  currency: z.enum(['USD', 'EUR', 'GBP', 'NOK', 'SEK', 'DKK', 'JPY', 'CAD', 'AUD', 'CHF']),
  initialBalance: z.string().regex(/^\d+$/).optional(),
});
```

## Development Best Practices

### Code Organization

- Domain-driven design principles
- Clear separation of concerns
- Modular architecture
- Consistent naming conventions

### Git Workflow

- Feature branch development
- Meaningful commit messages
- Code review process
- Automated testing in CI/CD

### Documentation

- Code comments for complex logic
- API documentation updates
- Architecture decision records
- Runbook maintenance

### Security

- Input validation on all endpoints
- Parameterized database queries
- Error message sanitization
- Security header implementation
