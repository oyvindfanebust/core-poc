# Banking Ledger POC

A comprehensive banking ledger proof-of-concept built with Node.js, TypeScript, TigerBeetle, and PostgreSQL. This monorepo provides enterprise-grade banking functionality including account management, transfers, loans, and SEPA payment processing.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- TigerBeetle database
- direnv (for environment management)

### Installation

```bash
git clone <repository-url>
cd core-poc
npm install

# Set up environment variables
cp .envrc.example .envrc
direnv allow

# Start infrastructure and services
docker-compose up -d
npm run dev:all
```

### Access Points

- **API Documentation**: http://localhost:7001/api-docs
- **Customer Frontend**: http://localhost:7002
- **External Transaction Simulator**: http://localhost:7006

## 📁 Repository Structure

```
core-poc/
├── apps/
│   ├── core-api/           # Main API server (port 7001)
│   ├── batch-processor/    # Background jobs (port 7003)
│   ├── customer-frontend/  # Next.js app (port 7002)
│   └── sepa-mock-service/  # External transaction simulator (port 7006)
├── packages/
│   ├── core-services/      # TigerBeetle, database services
│   ├── domain/            # Business logic
│   └── shared/            # Shared utilities
├── docs/                  # Documentation
└── config/               # Configuration files
```

## 🇪🇺 SEPA Operations

SEPA accounts are automatically initialized on startup:

```bash
# Verify SEPA accounts exist
curl http://localhost:7001/api/system-accounts | grep SEPA

# Create SEPA-enabled test account
curl -X POST http://localhost:7001/accounts \
  -H "Content-Type: application/json" \
  -d '{"type": "DEPOSIT", "customerId": "CUSTOMER-ABC-123", "currency": "EUR", "initialBalance": "100000"}'
```

> 📖 **Detailed SEPA Guide**: See [SEPA Architecture](docs/SEPA_ARCHITECTURE.md) for transfer flows and advanced configuration.

## 🏦 Core Features

### Banking Operations

- **Account Management**: Multi-currency deposit, loan, and credit accounts
- **Money Transfers**: Secure transfers with full audit trails
- **Loan Processing**: Payment plans, amortization schedules, disbursements
- **External Transactions**: ACH and Wire credit processing from external banks
- **Invoice Management**: Automated invoice generation and tracking

### SEPA Integration

- **Supported Currencies**: EUR, NOK, SEK, DKK with automatic initialization
- **System Accounts**: 12 accounts created automatically (3 types × 4 currencies)
- **Account Types**: Outgoing suspense, incoming suspense, settlement accounts
- **Configuration**: JSON-based mapping in `config/system-accounts.json`
- **API Endpoint**: `/api/system-accounts` for account inspection

### External Transaction Processing

- **ACH Credits**: USD transactions with STANDARD (2 days), SAME_DAY (6 hours), EXPRESS (2 hours) settlement
- **Wire Transfers**: Multi-currency (EUR, USD, GBP, JPY, CAD, AUD, CHF) with SWIFT network support
- **Settlement Tracking**: Complete audit trail with estimated and actual settlement dates
- **Status Monitoring**: Real-time transaction status lookup and error reporting
- **Testing Interface**: Comprehensive simulator at port 7006 for development and testing

### Loan Funding System

- **Loan Disbursements**: Controlled release of loan funds to customer accounts
- **Multi-Currency Support**: Handle loans and disbursements in different currencies
- **Currency Conversion**: Automatic conversion with exchange rate tracking
- **Progressive Disbursements**: Support for construction loans and line of credit
- **Validation Controls**: Comprehensive checks for loan eligibility and limits

### Enterprise Features

- **Type Safety**: Full TypeScript with Zod validation
- **Monitoring**: Health checks, metrics, structured logging
- **Internationalization**: English, Norwegian, Serbian support
- **Background Jobs**: Automated payment and invoice processing

## 🛠 Development Commands

```bash
# Development
npm run dev:all          # Start all services
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only

# Quality Assurance
npm run build            # TypeScript compilation
npm run lint             # ESLint validation
npm test                 # Fast tests
npm run test:all         # Full test suite

# Infrastructure
docker-compose up -d     # Start PostgreSQL, TigerBeetle
direnv allow            # Reload environment

# SEPA Operations
curl http://localhost:7001/api/system-accounts           # View all system accounts
curl http://localhost:7001/api/system-accounts | grep SEPA  # SEPA accounts only
npm run test -- --testNamePattern=sepa                  # Run SEPA tests

# External Transactions
curl http://localhost:7001/api/v1/external-transactions/status/ACH-STANDARD-123  # Check transaction status
npm run test -- tests/integration/fast-external-transactions.test.ts  # Run external transaction tests

# Loan Funding
curl -X POST http://localhost:7001/api/v1/loans/{loanId}/disburse  # Disburse loan funds
npm run test -- tests/integration/fast-loan-funding.test.ts  # Run loan funding tests
```

## 🏗 Architecture Highlights

### Data Storage

- **TigerBeetle**: ALL financial transactions and balances
- **PostgreSQL**: Metadata only (never financial data)
- **JSON Config**: System account mappings

### Design Patterns

- **Domain-Driven Design**: Clear separation of concerns
- **Repository Pattern**: Clean data access abstraction
- **Value Objects**: Type-safe Money, AccountId, CustomerId
- **Background Jobs**: Automated processing with proper scheduling

## 📚 Documentation

Detailed documentation is available in the `docs/` folder:

- **[API Usage](docs/API_USAGE.md)** - REST API examples and validation rules
- **[Configuration](docs/CONFIGURATION.md)** - Environment setup and deployment settings
- **[Architecture](docs/ARCHITECTURE.md)** - Design decisions and system architecture
- **[Features](docs/FEATURES.md)** - Detailed feature descriptions and capabilities
- **[Development](docs/DEVELOPMENT.md)** - Development workflow, testing, and debugging
- **[Internationalization](docs/INTERNATIONALIZATION.md)** - Multi-language setup and usage
- **[SEPA Architecture](docs/SEPA_ARCHITECTURE.md)** - SEPA payment infrastructure details
- **[External Transactions](docs/EXTERNAL_TRANSACTIONS.md)** - ACH and Wire credit processing system
- **[Loan Funding](docs/LOAN_FUNDING.md)** - Loan disbursement and funding operations

## 🧪 Testing

```bash
npm test                 # Unit and fast integration tests
npm run test:all         # Full test suite including E2E
npm run test:coverage    # Coverage reports
npm run test:watch       # Watch mode for development
```

**Test Customer**: Use `CUSTOMER-ABC-123` for all testing scenarios.

## 🌍 Multi-Language Support

The frontend supports three languages with complete translations:

- **English** (`/en`) - Default
- **Norwegian** (`/no`) - Norsk
- **Serbian** (`/sr`) - Српски

Language switching available in the navigation header.

## 💰 Supported Currencies

**10 currencies**: USD, EUR, GBP, NOK, SEK, DKK, JPY, CAD, AUD, CHF

**SEPA currencies**: EUR, NOK, SEK, DKK with dedicated suspense accounts (auto-initialized on startup)

### SEPA Account Structure

Each SEPA currency gets 3 system accounts:

- `SEPA-OUT-SUSPENSE-{CURRENCY}` - Outgoing transfers
- `SEPA-IN-SUSPENSE-{CURRENCY}` - Incoming transfers
- `SEPA-SETTLEMENT-{CURRENCY}` - Final settlement

## 🔧 Configuration

### Service Ports

- **6000-6001**: TigerBeetle (development/test)
- **7001**: Core API
- **7002**: Customer Frontend
- **7003**: Batch Processor
- **7006**: External Transaction Simulator
- **5432**: PostgreSQL

### Environment Variables

Key variables in `.envrc`:

- `NODE_ENV`: development/production/test
- `DB_*`: PostgreSQL connection settings
- `TIGERBEETLE_*`: TigerBeetle configuration
- `LOG_LEVEL`: Logging verbosity

### SEPA Configuration Files

- **`config/system-accounts.json`** - System account mappings (auto-created)
- **Location**: Project root, committed to version control
- **Format**: JSON with TigerBeetle ID mappings
- **Backup**: Template available at `config/system-accounts.json.template`

See [Configuration Guide](docs/CONFIGURATION.md) and [SEPA Architecture](docs/SEPA_ARCHITECTURE.md) for complete setup details.

## 🚦 Health & Monitoring

### Health Endpoints

- `/health` - Comprehensive system health
- `/health/ready` - Kubernetes readiness probe
- `/health/live` - Kubernetes liveness probe

### Metrics

- `/metrics` - Application metrics (JSON)
- `/metrics/prometheus` - Prometheus format

## 🔒 Security & Compliance

- **Input Validation**: Zod schemas for all API inputs
- **SQL Injection Prevention**: Parameterized queries
- **Financial Data Isolation**: TigerBeetle-only storage
- **Audit Trails**: Immutable transaction history
- **Error Handling**: No sensitive data in responses

## 📝 Contributing

1. **Follow TDD**: Write tests before implementation
2. **Code Quality**: Run `npm run build && npm run lint && npm test`
3. **Translations**: Add all three languages for frontend changes
4. **Documentation**: Update relevant docs for API/architecture changes

See [Development Guide](docs/DEVELOPMENT.md) for detailed workflow.

## 📄 License

ISC License - see LICENSE file for details.

## 🆘 Support

- **API Documentation**: http://localhost:7001/api-docs
- **Health Status**: http://localhost:7001/health
- **Application Logs**: Check console output or log files
- **Issues**: Open GitHub issue for bugs or questions
