# Banking Ledger POC

A comprehensive banking ledger proof-of-concept built with Node.js, TypeScript, TigerBeetle, and PostgreSQL. This monorepo contains both the backend API and frontend applications for enterprise-grade banking functionality including account management, transfers, loans, and invoice processing.

## Repository Structure

```
core-poc/
├── backend/          # Backend API server
├── frontend/         # Customer-facing web application (Next.js)
├── shared/           # Shared types and utilities
├── docker-compose.yml
└── package.json      # Root workspace configuration
```

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

### Payment Plan Features
- **Multiple Loan Types**: Support for annuity and serial loan structures
- **Flexible Payment Frequencies**: Weekly, bi-weekly, monthly, quarterly, semi-annually, and annually
- **Fee Management**: Comprehensive fee structures (origination, processing, insurance, late payment, prepayment, appraisal, administration)
- **Automated Invoice Generation**: Scheduled payment invoice creation
- **Amortization Schedules**: Complete payment breakdowns with principal/interest calculations
- **Payment Processing Integration**: Direct TigerBeetle transfer processing for loan payments

### Multi-Currency Support
- **10 Supported Currencies**: USD, EUR, GBP, NOK, SEK, DKK, JPY, CAD, AUD, CHF
- **ISO 4217 Standards**: All currencies mapped to standard ISO codes
- **Currency-Specific Accounts**: Each account tied to a single currency for compliance

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 12+
- TigerBeetle database (for accounting ledger)
- direnv (for environment variable management)

### 1. Installation
```bash
git clone <repository-url>
cd core-poc
npm install  # This will install all workspace dependencies
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
cp .envrc.example .envrc
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

### 4. Infrastructure Setup
```bash
# Start all required services (PostgreSQL, TigerBeetle, RabbitMQ)
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 5. Start the Application

#### Backend Only
```bash
# Development with auto-reload
npm run dev:backend

# Or from the root
npm run dev  # Defaults to backend
```

#### Frontend Only
```bash
# Development server
npm run dev:frontend
```

#### Both Backend and Frontend
```bash
# Run both concurrently
npm run dev:all
```

#### Production Build
```bash
# Build all workspaces
npm run build

# Build specific workspace
npm run build:backend
npm run build:frontend
```

## API Documentation

### Backend API
Once the backend is running, visit:
- **API Documentation**: http://localhost:7001/api-docs
- **Health Checks**: http://localhost:7001/health
- **Metrics**: http://localhost:7001/metrics
- **API Info**: http://localhost:7001/api/info

### Frontend Application
Once the frontend is running:
- **Customer Banking**: http://localhost:7002
- **Next.js Dev Tools**: Available in development mode

## Configuration

### Environment Variables (managed with direnv)

The application uses direnv to manage environment variables. Copy `.envrc.example` to `.envrc` and customize as needed.

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production/test) | development |
| `PORT` | Server port | 7001 |
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
curl -X POST http://localhost:7001/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "type": "DEPOSIT",
    "customerId": "CUSTOMER-ABC-123",
    "currency": "EUR",
    "initialBalance": "100000"
  }'
```

### Create a Loan Account
```bash
curl -X POST http://localhost:7001/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "type": "LOAN", 
    "customerId": "CUSTOMER-ABC-123",
    "currency": "GBP",
    "principalAmount": "20000000",
    "interestRate": "4.5",
    "termMonths": "360",
    "loanType": "ANNUITY",
    "paymentFrequency": "QUARTERLY",
    "fees": [
      {
        "type": "ORIGINATION",
        "amount": "50000",
        "description": "Loan origination fee"
      },
      {
        "type": "INSURANCE",
        "amount": "25000", 
        "description": "Loan protection insurance"
      }
    ]
  }'
```

### Transfer Money
```bash
curl -X POST http://localhost:7001/transfers \
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
curl -X POST http://localhost:7001/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "1234567890",
    "amount": "250000",
    "dueDate": "2024-12-01"
  }'
```

### Get Payment Plan
```bash
curl -X GET http://localhost:7001/accounts/1234567890/payment-plan
```

### Get Amortization Schedule
```bash
curl -X GET http://localhost:7001/accounts/1234567890/amortization-schedule
```

### List Customer Accounts
```bash
# Get all accounts for a specific customer
curl -X GET http://localhost:7001/customers/CUSTOMER-ABC-123/accounts

# Example response:
# [
#   {
#     "accountId": "1234567890123456789",
#     "customerId": "CUSTOMER-ABC-123",
#     "accountType": "DEPOSIT",
#     "currency": "EUR",
#     "createdAt": "2024-01-01T12:00:00.000Z",
#     "updatedAt": "2024-01-01T12:00:00.000Z"
#   },
#   {
#     "accountId": "9876543210987654321",
#     "customerId": "CUSTOMER-ABC-123",
#     "accountType": "LOAN",
#     "currency": "GBP",
#     "createdAt": "2024-01-02T10:30:00.000Z",
#     "updatedAt": "2024-01-02T10:30:00.000Z"
#   }
# ]
```

## Validation Rules and Constraints

### Customer IDs
- **Length**: 1-50 characters
- **Format**: Letters, numbers, hyphens, and underscores only (`[A-Za-z0-9\-_]+`)
- **Examples**: `CUSTOMER-ABC-123`, `CUST001`, `User_12345`

### Currencies
- **Supported**: USD, EUR, GBP, NOK, SEK, DKK, JPY, CAD, AUD, CHF
- **Standard**: ISO 4217 currency codes
- **Validation**: Currency must be supported and valid for the operation

### Money Amounts
- **Format**: Positive integers as strings (representing cents/smallest unit)
- **Examples**: `"100000"` = $1,000.00, `"50000"` = $500.00
- **Validation**: Must be valid BigInt values >= 0

### Payment Frequencies
- **Supported**: WEEKLY, BI_WEEKLY, MONTHLY, QUARTERLY, SEMI_ANNUALLY, ANNUALLY
- **Use Cases**: Flexible loan payment schedules and invoice generation

### Fee Types
- **Supported**: ORIGINATION, PROCESSING, INSURANCE, LATE_PAYMENT, PREPAYMENT, APPRAISAL, ADMINISTRATION
- **Structure**: Each fee includes type, amount (in cents), and description

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

## Internationalization (i18n)

The frontend application supports multiple languages with full internationalization using next-intl.

### Supported Languages
- **English**: Default language (`en`)
- **Norwegian**: Complete translations (`no`)
- **Serbian**: Complete translations with Cyrillic script (`sr`)

### Features
- **Language Switching**: Dynamic language switching via dropdown in navigation
- **URL-based Locale**: Language preference reflected in URL (`/en`, `/no`, `/sr`)
- **Complete Coverage**: All UI text, navigation, forms, and messages translated
- **Type-safe Translations**: TypeScript integration for translation keys
- **Fallback Support**: Graceful fallback to English if translations missing

### Usage
1. **Language Switcher**: Click the globe icon in the top navigation
2. **Direct URL Access**: Navigate directly to `/en`, `/no`, or `/sr` for specific languages
3. **Persistent State**: Language preference maintained across page navigation
4. **Root URL**: Automatically redirects to user's preferred language based on browser settings

### Translation Files
Translation files are located in `frontend/messages/`:
- `en.json` - English (default)
- `no.json` - Norwegian (Norsk)
- `sr.json` - Serbian (Српски)

### Adding New Languages
1. Create new translation file in `frontend/messages/[locale].json`
2. Add locale to `frontend/i18n/config.ts` locales array
3. Add locale name to `localeNames` mapping
4. Update middleware pattern if needed

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