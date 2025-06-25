# API Usage Guide

This guide provides examples of how to interact with the Core Banking API.

## Base URL

```
http://localhost:7001
```

## Authentication

Currently, the API does not require authentication (development setup).

## Account Management

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

## Transfers

### Transfer Money Between Accounts

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

## Invoice Management

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

## Loan Operations

### Get Payment Plan

```bash
curl -X GET http://localhost:7001/accounts/1234567890/payment-plan
```

### Get Amortization Schedule

```bash
curl -X GET http://localhost:7001/accounts/1234567890/amortization-schedule
```

## SEPA Operations

The system automatically handles SEPA account initialization and management. System accounts are created and managed transparently:

```bash
# System accounts are automatically created with prefixed identifiers:
# SEPA-OUT-SUSPENSE-EUR, SEPA-IN-SUSPENSE-EUR, SEPA-SETTLEMENT-EUR
# SEPA-OUT-SUSPENSE-NOK, SEPA-IN-SUSPENSE-NOK, SEPA-SETTLEMENT-NOK
# And similar for SEK and DKK currencies

# Check system account mappings (internal)
curl -X GET http://localhost:7001/api/system-accounts
```

## Health and Monitoring

### Health Checks

```bash
# Comprehensive health status
curl -X GET http://localhost:7001/health

# Readiness probe for Kubernetes
curl -X GET http://localhost:7001/health/ready

# Liveness probe for Kubernetes
curl -X GET http://localhost:7001/health/live
```

### Metrics

```bash
# Application metrics (JSON)
curl -X GET http://localhost:7001/metrics

# HTTP-specific metrics
curl -X GET http://localhost:7001/metrics/http

# Prometheus-format metrics
curl -X GET http://localhost:7001/metrics/prometheus
```

### API Documentation

Once the backend is running, visit:

- **Interactive API Documentation**: http://localhost:7001/api-docs
- **API Info**: http://localhost:7001/api/info

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
