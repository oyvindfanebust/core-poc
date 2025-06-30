# External Transactions System

The External Transactions system enables the banking platform to receive and process incoming ACH and Wire credit transactions from external financial institutions. This system provides a complete solution for external payment processing with proper validation, tracking, and settlement management.

## Overview

### Key Features

- **ACH Credit Processing**: Handles incoming ACH transactions from US banks
- **International Wire Transfers**: Processes multi-currency wire transfers via SWIFT network
- **Transaction Status Tracking**: Complete audit trail with settlement dates
- **Multiple Urgency Levels**: Different processing speeds based on business needs
- **Comprehensive Validation**: Routing numbers, SWIFT codes, and business rules
- **Error Handling**: Robust error reporting with retry capabilities

### Supported Transaction Types

#### ACH Credit Transactions

- **Currency**: USD only
- **Urgency Levels**:
  - `STANDARD`: 2 business days settlement
  - `SAME_DAY`: 6 hours settlement
  - `EXPRESS`: 2 hours settlement
- **Requirements**: Valid US routing number (9 digits)

#### Wire Credit Transactions

- **Currencies**: EUR, USD, GBP, JPY, CAD, AUD, CHF
- **Urgency Levels**:
  - `STANDARD`: 1 business day settlement
  - `EXPRESS`: 4 hours settlement
  - `PRIORITY`: 1 hour settlement
- **Requirements**: Valid SWIFT/BIC code (8-11 characters)

## API Endpoints

### Base URL

```
http://localhost:7001/api/v1/external-transactions
```

### 1. Process ACH Credit Transaction

**Endpoint**: `POST /ach-credit`

**Description**: Processes an incoming ACH credit transaction from an external US bank.

**Request Body**:

```json
{
  "targetAccountId": "1234567890123456789",
  "amount": "250000",
  "currency": "USD",
  "routingNumber": "021000021",
  "originatingBankName": "JPMorgan Chase Bank, N.A.",
  "reference": "Payroll deposit for employee #12345",
  "urgency": "STANDARD"
}
```

**Response** (Success):

```json
{
  "transactionId": "ACH-STANDARD-1234567890-abc123",
  "status": "SUCCESS",
  "amount": "250000",
  "currency": "USD",
  "targetAccountId": "1234567890123456789",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "estimatedSettlement": "2024-01-03T12:00:00.000Z"
}
```

**Response** (Failure):

```json
{
  "transactionId": "ACH-STANDARD-1234567890-def456",
  "status": "FAILED",
  "amount": "250000",
  "currency": "USD",
  "targetAccountId": "1234567890123456789",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "errorDetails": {
    "code": "ACH_PROCESSING_FAILED",
    "message": "ACH network temporarily unavailable",
    "retryable": true
  }
}
```

### 2. Process Wire Credit Transaction

**Endpoint**: `POST /wire-credit`

**Description**: Processes an incoming international wire transfer via SWIFT network.

**Request Body**:

```json
{
  "targetAccountId": "1234567890123456789",
  "amount": "750000",
  "currency": "EUR",
  "swiftCode": "DEUTDEFF",
  "originatingBankName": "Deutsche Bank AG",
  "correspondentBank": "Deutsche Bank Trust Company Americas",
  "reference": "International business payment - Invoice #INV-2024-001",
  "urgency": "STANDARD"
}
```

**Response** (Success):

```json
{
  "transactionId": "WIRE-STANDARD-1234567890-xyz789",
  "status": "SUCCESS",
  "amount": "750000",
  "currency": "EUR",
  "targetAccountId": "1234567890123456789",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "estimatedSettlement": "2024-01-02T12:00:00.000Z"
}
```

### 3. Get Transaction Status

**Endpoint**: `GET /status/{transactionId}`

**Description**: Retrieves the current status and details of an external transaction.

**Path Parameters**:

- `transactionId`: Unique transaction identifier (e.g., `ACH-STANDARD-1234567890-abc123`)

**Response**:

```json
{
  "transactionId": "WIRE-EXPRESS-9876543210-xyz789",
  "status": "SUCCESS",
  "type": "WIRE_CREDIT",
  "amount": "750000",
  "currency": "EUR",
  "targetAccountId": "1234567890123456789",
  "originatingBank": "Deutsche Bank AG",
  "reference": "International business payment - Invoice #INV-2024-001",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "settlementDate": "2024-01-01T16:00:00.000Z"
}
```

## Implementation Details

### Transaction ID Format

Transaction IDs follow a standardized format:

```
{TYPE}-{URGENCY}-{TIMESTAMP}-{RANDOM_ID}
```

Examples:

- `ACH-STANDARD-1751284770760-aoy2f1rxn`
- `WIRE-EXPRESS-1751284770760-xyz789abc`

### Settlement Timing

#### ACH Transactions

| Urgency Level | Settlement Time | Business Use Case                |
| ------------- | --------------- | -------------------------------- |
| `STANDARD`    | 2 business days | Regular payroll, vendor payments |
| `SAME_DAY`    | 6 hours         | Urgent vendor payments           |
| `EXPRESS`     | 2 hours         | Emergency fund transfers         |

#### Wire Transactions

| Urgency Level | Settlement Time | Business Use Case                      |
| ------------- | --------------- | -------------------------------------- |
| `STANDARD`    | 1 business day  | Regular international payments         |
| `EXPRESS`     | 4 hours         | Time-sensitive commercial transactions |
| `PRIORITY`    | 1 hour          | Critical emergency transfers           |

### Validation Rules

#### ACH Transactions

- **Routing Number**: Must be exactly 9 digits, US bank routing numbers only
- **Currency**: Must be USD
- **Amount**: Must be positive integer (cents)
- **Reference**: Maximum 140 characters
- **Originating Bank**: Required, maximum 100 characters

#### Wire Transactions

- **SWIFT Code**: 8-11 characters, valid format (6 letters + 2-5 alphanumeric)
- **Currency**: EUR, USD, GBP, JPY, CAD, AUD, CHF
- **Amount**: Must be positive integer (cents)
- **Reference**: Maximum 140 characters
- **Originating Bank**: Required, maximum 100 characters
- **Correspondent Bank**: Optional, maximum 100 characters

### Error Handling

The system provides comprehensive error handling with specific error codes:

#### Common Error Codes

- `ACH_PROCESSING_FAILED`: ACH network issues (retryable)
- `WIRE_PROCESSING_FAILED`: SWIFT network issues (retryable)
- `INVALID_ROUTING_NUMBER`: Invalid US bank routing number
- `INVALID_SWIFT_CODE`: Invalid SWIFT/BIC code format
- `CURRENCY_NOT_SUPPORTED`: Unsupported currency for transaction type
- `AMOUNT_VALIDATION_FAILED`: Invalid amount format or value

#### Retry Logic

- Transactions marked as `retryable: true` can be safely retried
- Failed transactions remain in the system for audit purposes
- Transaction IDs are unique even for retry attempts

## Testing

### Integration Tests

The system includes comprehensive integration tests covering:

```bash
# Run external transaction tests
npm run test --workspace=@core-poc/core-api

# Run only external transaction integration tests
npm test tests/integration/fast-external-transactions.test.ts
```

### End-to-End Tests

Complete workflow tests validate real-world scenarios:

```bash
# Run e2e tests (requires running services)
npm run test:e2e --workspace=@core-poc/core-api
```

### Test Scenarios Covered

- **ACH Processing**: All urgency levels, validation, error handling
- **Wire Processing**: Multi-currency, SWIFT validation, settlement timing
- **Status Tracking**: Transaction lookup, error details, audit trail
- **Error Scenarios**: Network failures, validation errors, retry logic
- **Cross-System Integration**: Account validation, business rule enforcement

## Production Considerations

### Security

- All endpoints require proper authentication (implementation-specific)
- Transaction data is validated and sanitized
- Audit trails are maintained for compliance
- Sensitive financial data follows banking security standards

### Monitoring

- Transaction processing metrics available via `/metrics` endpoint
- Comprehensive logging for all transaction events
- Settlement timing monitoring for SLA compliance
- Error rate tracking and alerting

### Scalability

- In-memory transaction store (MVP implementation)
- Designed for future database persistence integration
- Stateless processing enables horizontal scaling
- Idempotent operations support retry scenarios

### Compliance

- Transaction records maintained for regulatory requirements
- Settlement timing follows banking industry standards
- Error reporting supports operational compliance
- Audit trails enable transaction investigations

## Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL (for account metadata)
- TigerBeetle (for financial ledger)

### Environment Variables

```bash
# Core API configuration
PORT=7001
DATABASE_URL=postgresql://localhost:5432/banking_poc
TIGERBEETLE_CLUSTER_ID=0
TIGERBEETLE_FILE_PATH=./data/tigerbeetle.tigerbeetle

# Logging configuration
LOG_LEVEL=info
```

### Starting the Service

```bash
# Start infrastructure
docker-compose up -d

# Start the Core API service
npm run dev:backend

# External transactions available at:
# http://localhost:7001/api/v1/external-transactions
```

### API Documentation

Interactive API documentation is available via Swagger UI:

```
http://localhost:7001/api-docs
```

## Examples

### Example 1: Standard ACH Payroll Deposit

```bash
curl -X POST http://localhost:7001/api/v1/external-transactions/ach-credit \
  -H "Content-Type: application/json" \
  -d '{
    "targetAccountId": "1234567890123456789",
    "amount": "250000",
    "currency": "USD",
    "routingNumber": "021000021",
    "originatingBankName": "JPMorgan Chase Bank, N.A.",
    "reference": "Payroll deposit for employee #12345",
    "urgency": "STANDARD"
  }'
```

### Example 2: Express EUR Wire Transfer

```bash
curl -X POST http://localhost:7001/api/v1/external-transactions/wire-credit \
  -H "Content-Type: application/json" \
  -d '{
    "targetAccountId": "1234567890123456789",
    "amount": "1000000",
    "currency": "EUR",
    "swiftCode": "DEUTDEFF",
    "originatingBankName": "Deutsche Bank AG",
    "reference": "Urgent business settlement",
    "urgency": "EXPRESS"
  }'
```

### Example 3: Check Transaction Status

```bash
curl -X GET http://localhost:7001/api/v1/external-transactions/status/ACH-STANDARD-1234567890-abc123
```

## Troubleshooting

### Common Issues

#### Transaction Validation Failures

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "routingNumber",
      "message": "Routing number must be exactly 9 digits",
      "code": "too_small"
    }
  ]
}
```

**Solution**: Ensure routing numbers are exactly 9 digits for ACH transactions.

#### SWIFT Code Format Errors

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "swiftCode",
      "message": "SWIFT code must be in valid format",
      "code": "invalid_string"
    }
  ]
}
```

**Solution**: SWIFT codes must be 8-11 characters: 6 letters + 2-5 alphanumeric.

#### Transaction Processing Failures

- Check system logs for detailed error information
- Verify external network connectivity for ACH/SWIFT networks
- Ensure target account exists and is valid
- Check if retry is recommended in error response

### Logging

All transaction events are logged with structured data:

```bash
# View transaction logs
tail -f apps/core-api/logs/combined.log | grep "external-transaction"

# Filter by transaction ID
grep "ACH-STANDARD-1234567890-abc123" apps/core-api/logs/combined.log
```

## Related Documentation

- [API Usage Guide](./API_USAGE.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Development Guide](./DEVELOPMENT.md)
- [SEPA Architecture](./SEPA_ARCHITECTURE.md)
- [Configuration Guide](./CONFIGURATION.md)
