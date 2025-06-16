# Banking Ledger API

A comprehensive banking ledger API built with Node.js, TypeScript, TigerBeetle, and PostgreSQL. This system provides enterprise-grade banking functionality including account management, transfers, loans, and invoice processing.

## Features

### Core Banking Operations
- **Account Management**: Create and manage deposit, loan, and credit accounts
- **Transfers**: Secure money transfers between accounts with full audit trails
- **Loan Processing**: Automated loan payment calculations and payment plan management
- **Invoice Management**: Create, track, and process invoices with overdue handling

### Enterprise Features
- **Type Safety**: Full TypeScript implementation with runtime validation using Zod
- **Database Persistence**: PostgreSQL with automated migrations
- **Monitoring**: Comprehensive health checks, metrics, and Prometheus integration
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Structured Logging**: Winston-based logging with different levels for dev/prod
- **Graceful Shutdown**: Proper resource cleanup and background job management
- **Value Objects**: Type-safe Money, AccountId, and CustomerId implementations

### Architecture Highlights
- **Domain-Driven Design**: Clear separation between domain logic and infrastructure
- **Repository Pattern**: Abstracted data access layer
- **Service Layer**: Business logic encapsulated in domain services
- **Background Jobs**: Automated payment processing and invoice management
- **Request Validation**: Comprehensive input validation with detailed error messages

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 12+
- TigerBeetle database (for accounting ledger)
- direnv (for environment variable management)

### 1. Installation
```bash
git clone <repository-url>
cd yet-another-core-poc
npm install
```

### 2. Environment Setup with direnv
```bash
# Install direnv if not already installed
# macOS: brew install direnv
# Ubuntu: sudo apt install direnv
# Or visit: https://direnv.net/docs/installation.html

# Set up your shell hook (add to ~/.bashrc, ~/.zshrc, etc.)
# For bash: echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
# For zsh: echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc

# Copy the template and customize for your environment
cp .envrc.template .envrc
# Edit .envrc with your configuration

# Allow direnv to load the environment variables
direnv allow
```

### 3. Database Setup
```bash
# Create PostgreSQL database
createdb banking_poc

# Database schema will be automatically created on first run
```

### 4. TigerBeetle Setup
```bash
# Download and extract TigerBeetle binary
# Place the tigerbeetle binary in the project root
# Or follow TigerBeetle installation instructions
```

### 5. Start the Application
```bash
# Development with auto-reload
npm run dev

# Production build and start
npm run build
npm start
```

## API Documentation

Once running, visit:
- **API Documentation**: http://localhost:3002/api-docs
- **Health Checks**: http://localhost:3002/health
- **Metrics**: http://localhost:3002/metrics
- **API Info**: http://localhost:3002/api/info

## Configuration

### Environment Variables (managed with direnv)

The application uses direnv to manage environment variables. Copy `.envrc.template` to `.envrc` and customize as needed.

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production/test) | development |
| `PORT` | Server port | 3002 |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | banking_poc |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | postgres |
| `TIGERBEETLE_CLUSTER_ID` | TigerBeetle cluster ID | 0 |
| `TIGERBEETLE_ADDRESSES` | TigerBeetle server addresses | 3000 |
| `LOG_LEVEL` | Logging level (error/warn/info/debug) | info |

### Development vs Production

**Development:**
- Detailed console logging with colors
- Background jobs run every 30-60 seconds for testing
- Swagger UI enabled
- Detailed error messages

**Production:**
- JSON structured logging to files
- Background jobs run on realistic schedules (daily/monthly)
- Reduced error details for security
- Performance optimizations

## API Usage Examples

### Create a Deposit Account
```bash
curl -X POST http://localhost:3002/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "type": "DEPOSIT",
    "customerId": "CUST001",
    "currency": "USD",
    "initialBalance": "100000"
  }'
```

### Create a Loan Account
```bash
curl -X POST http://localhost:3002/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "type": "LOAN", 
    "customerId": "CUST001",
    "currency": "USD",
    "principalAmount": "20000000",
    "interestRate": "4.5",
    "termMonths": "360"
  }'
```

### Transfer Money
```bash
curl -X POST http://localhost:3002/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "fromAccountId": "1234567890",
    "toAccountId": "0987654321", 
    "amount": "50000",
    "currency": "USD"
  }'
```

### Create Invoice
```bash
curl -X POST http://localhost:3002/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "1234567890",
    "amount": "250000",
    "dueDate": "2024-12-01"
  }'
```

## Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Structure
- **Unit Tests**: Domain logic, value objects, and services
- **Integration Tests**: Database interactions and repository layer
- **E2E Tests**: Full API workflows with real TigerBeetle instances

## Monitoring and Observability

### Health Checks
- `GET /health` - Comprehensive health status
- `GET /health/ready` - Readiness probe for Kubernetes
- `GET /health/live` - Liveness probe for Kubernetes

### Metrics
- `GET /metrics` - Application metrics (JSON)
- `GET /metrics/http` - HTTP-specific metrics
- `GET /metrics/prometheus` - Prometheus-format metrics

### Logging
- Structured JSON logging in production
- Colored console logging in development
- Request/response logging with correlation IDs
- Error tracking with stack traces

## Database Migrations

The application uses an automated migration system:

```typescript
// Migrations run automatically on startup
// To add new migrations, edit src/database/migrations.ts

// Manual migration management (if needed)
const migrationRunner = new MigrationRunner(db);
await migrationRunner.runMigrations();
await migrationRunner.rollbackMigration('migration_id');
```

## Background Jobs

### Payment Plan Processing
- **Development**: Runs every 30 seconds
- **Production**: Runs monthly
- Processes loan payments and updates remaining balances

### Invoice Processing
- **Development**: Runs every 60 seconds
- **Production**: Runs daily
- Marks overdue invoices and triggers notifications

## Architecture Decisions

### Why TigerBeetle?
- **Performance**: Optimized for high-frequency financial transactions
- **ACID Compliance**: Ensures data consistency for financial operations
- **Double-Entry Bookkeeping**: Built-in accounting principles
- **Audit Trail**: Immutable transaction history

### Why PostgreSQL?
- **Reliability**: ACID transactions and data integrity
- **Scalability**: Excellent performance for analytical queries
- **JSON Support**: Flexible data storage when needed
- **Ecosystem**: Rich tooling and monitoring support

### Design Patterns Used
- **Repository Pattern**: Clean data access abstraction
- **Domain Services**: Business logic encapsulation
- **Value Objects**: Type-safe financial primitives
- **Factory Pattern**: Service instantiation and dependency injection
- **Command Pattern**: Background job processing

## Security Considerations

- **Input Validation**: All inputs validated using Zod schemas
- **SQL Injection Prevention**: Parameterized queries throughout
- **Error Handling**: No sensitive data leaked in error responses
- **Rate Limiting**: Ready for implementation (middleware structure in place)
- **CORS**: Configurable cross-origin request handling
- **Helmet**: Security headers for web protection

## Performance Features

- **Connection Pooling**: PostgreSQL connection management
- **Background Processing**: Non-blocking job execution
- **Metrics Collection**: Performance monitoring and alerting
- **Graceful Shutdown**: Clean resource cleanup
- **Memory Management**: Monitoring and alerting for memory usage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run the full test suite
5. Submit a pull request

### Code Style
- TypeScript strict mode enabled
- ESLint and Prettier for code formatting
- Comprehensive error handling
- Structured logging throughout
- Domain-driven design principles

## License

ISC License - see LICENSE file for details

## Support

For issues and questions:
- Check the API documentation at `/api-docs`
- Review health status at `/health`
- Check application logs
- Open an issue in the repository