# Features Documentation

This document provides detailed information about the banking system's features and capabilities.

## Core Banking Operations

### Account Management

**Supported Account Types:**

- **Deposit Accounts**: Standard checking and savings accounts
- **Loan Accounts**: Various loan products with payment plans
- **Credit Accounts**: Credit line management (planned)

**Key Features:**

- Multi-currency support (10 currencies)
- Automated account number generation
- Account metadata management
- Balance tracking through TigerBeetle
- Customer account association

### Money Transfers

**Transfer Types:**

- **Internal Transfers**: Between customer accounts
- **External Transfers**: To/from external banking systems
- **SEPA Transfers**: European payment area transfers
- **Loan Payments**: Automated loan payment processing

**Features:**

- Real-time balance updates
- Transaction audit trails
- Multi-currency support
- Transfer validation and limits
- Idempotent operations

### Invoice Management

**Invoice Operations:**

- **Creation**: Generate invoices for loan payments
- **Tracking**: Monitor invoice status and due dates
- **Processing**: Automated payment processing
- **Overdue Handling**: Automatic overdue marking

**Features:**

- Scheduled invoice generation
- Payment plan integration
- Multi-currency invoicing
- Due date management

## Payment Plan Features

### Loan Types

**Annuity Loans:**

- Fixed monthly payments
- Principal and interest calculations
- Amortization schedule generation

**Serial Loans:**

- Fixed principal payments
- Decreasing interest over time
- Flexible payment structures

### Payment Frequencies

**Supported Frequencies:**

- **WEEKLY**: Every 7 days
- **BI_WEEKLY**: Every 14 days
- **MONTHLY**: Monthly payments (most common)
- **QUARTERLY**: Every 3 months
- **SEMI_ANNUALLY**: Every 6 months
- **ANNUALLY**: Yearly payments

### Fee Management

**Fee Types:**

- **ORIGINATION**: Loan setup fees
- **PROCESSING**: Transaction processing fees
- **INSURANCE**: Loan protection insurance
- **LATE_PAYMENT**: Penalties for late payments
- **PREPAYMENT**: Early payment penalties
- **APPRAISAL**: Property appraisal fees
- **ADMINISTRATION**: Administrative fees

**Features:**

- Flexible fee structures
- Multi-currency fee support
- Automated fee calculation
- Fee integration with payment plans

### Amortization Schedules

**Capabilities:**

- Complete payment breakdowns
- Principal/interest calculations
- Remaining balance tracking
- Payment date scheduling
- Early payment scenarios

## Multi-Currency Support

### Supported Currencies

**Major Currencies:**

- **USD**: US Dollar
- **EUR**: Euro
- **GBP**: British Pound
- **JPY**: Japanese Yen
- **CHF**: Swiss Franc
- **CAD**: Canadian Dollar
- **AUD**: Australian Dollar

**Nordic Currencies:**

- **NOK**: Norwegian Krone
- **SEK**: Swedish Krona
- **DKK**: Danish Krone

### Currency Features

- **ISO 4217 Standards**: All currencies follow international standards
- **Currency-Specific Accounts**: Each account tied to single currency
- **Exchange Rate Ready**: Framework for currency conversion
- **Compliance**: Regional currency regulations support

## SEPA Payment Infrastructure

### SEPA Support

**Supported Currencies:**

- **EUR**: Euro (primary SEPA currency)
- **NOK**: Norwegian Krone
- **SEK**: Swedish Krona
- **DKK**: Danish Krone

### System Account Management

**Account Types:**

- **Customer Accounts**: Regular banking accounts (numeric IDs)
- **System Accounts**: Internal processing accounts (string IDs)
- **Suspense Accounts**: Temporary holding accounts for transfers

### Suspense Account Types

**Outgoing Suspense**: `SEPA-OUT-SUSPENSE-{CURRENCY}`

- Temporary holding for outgoing SEPA transfers
- Used during external transfer processing

**Incoming Suspense**: `SEPA-IN-SUSPENSE-{CURRENCY}`

- Temporary holding for incoming SEPA transfers
- Processing buffer for external payments

**Settlement Accounts**: `SEPA-SETTLEMENT-{CURRENCY}`

- Final settlement for SEPA operations
- Interface with external SEPA network

### SEPA Transfer Flow

**Outgoing Transfers:**

1. Customer account debited
2. Funds moved to outgoing suspense
3. SEPA message generated
4. Funds settled through SEPA network
5. Final settlement confirmation

**Incoming Transfers:**

1. SEPA message received
2. Funds arrive in settlement account
3. Moved to incoming suspense
4. Validation and processing
5. Customer account credited

## Enterprise Features

### Type Safety

**TypeScript Implementation:**

- Strict type checking
- Runtime validation with Zod
- Type-safe API contracts
- Compile-time error prevention

### Database Persistence

**PostgreSQL Features:**

- Automated database migrations
- ACID transaction support
- Connection pooling
- Query optimization

### Monitoring & Observability

**Health Checks:**

- Comprehensive system health monitoring
- Kubernetes-ready probes
- Dependency health validation

**Metrics Collection:**

- Application performance metrics
- Business metrics tracking
- Prometheus integration
- Custom metric support

**Structured Logging:**

- JSON-formatted logs
- Correlation ID tracking
- Multiple log levels
- Request/response logging

### API Documentation

**Interactive Documentation:**

- Swagger/OpenAPI integration
- Live API testing
- Request/response examples
- Schema documentation

### Graceful Shutdown

**Features:**

- Proper resource cleanup
- Background job completion
- Database connection closure
- Signal handling

## Value Objects

### Money Object

**Features:**

- Always integer values (cents)
- Currency-aware operations
- Arithmetic operations
- Validation and constraints

### Account ID Object

**Types:**

- Customer account IDs (numeric)
- System account IDs (string)
- Type-safe operations
- Validation rules

### Customer ID Object

**Features:**

- Alphanumeric validation
- Length constraints
- Format validation
- Unique identification

## Background Jobs

### Payment Plan Processing

**Development Mode:**

- Runs every 30 seconds for testing
- Immediate feedback for development

**Production Mode:**

- Monthly execution schedule
- Efficient batch processing

**Features:**

- Loan payment calculations
- Balance updates
- Payment plan advancement
- Error handling and retry logic

### Invoice Processing

**Development Mode:**

- Runs every 60 seconds for testing
- Quick turnaround for testing

**Production Mode:**

- Daily execution schedule
- Optimized for production loads

**Features:**

- Overdue invoice detection
- Status updates
- Notification triggers
- Automated processing

## Request Validation

### Zod Schema Validation

**Features:**

- Runtime type checking
- Custom validation rules
- Detailed error messages
- Type inference

**Validation Areas:**

- API request bodies
- Query parameters
- Configuration files
- Database inputs

### Error Handling

**Comprehensive Error Management:**

- Structured error responses
- Error categorization
- Stack trace logging
- User-friendly messages
