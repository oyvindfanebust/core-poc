# Loan Funding System

The Loan Funding system provides comprehensive loan disbursement capabilities for the banking platform. This system handles the controlled release of loan funds to customer accounts with proper validation, currency conversion, and audit trails.

## Overview

### Key Features

- **Loan Disbursement**: Transfer funds from loan accounts to target accounts
- **Multi-Currency Support**: Handle loans and disbursements in different currencies
- **Currency Conversion**: Automatic conversion when loan and target currencies differ
- **Validation and Controls**: Comprehensive checks for loan eligibility and limits
- **Audit Trail**: Complete logging of all disbursement activities
- **Error Handling**: Robust error reporting with detailed failure reasons

### Business Use Cases

- **Initial Loan Disbursement**: Release full or partial loan amounts to borrowers
- **Construction Loans**: Progressive disbursements based on project milestones
- **Line of Credit**: Multiple disbursements up to approved credit limits
- **Cross-Currency Loans**: International lending with currency conversion

## API Endpoints

### Base URL

```
http://localhost:7001/api/v1/loans
```

### Loan Disbursement

**Endpoint**: `POST /{loanId}/disburse`

**Description**: Disburses funds from a loan account to a specified target account.

**Path Parameters**:

- `loanId`: The loan account identifier from which to disburse funds

**Request Body**:

```json
{
  "targetAccountId": "1234567890123456789",
  "amount": "50000000",
  "description": "Initial loan disbursement for home purchase",
  "currencyConversion": {
    "fromCurrency": "EUR",
    "toCurrency": "USD",
    "exchangeRate": "1.0850",
    "convertedAmount": "54250000"
  }
}
```

**Response** (Success):

```json
{
  "disbursementId": "DISB-20241201-001",
  "loanId": "9876543210987654321",
  "targetAccountId": "1234567890123456789",
  "amount": "50000000",
  "currency": "EUR",
  "description": "Initial loan disbursement for home purchase",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "transferId": "1002",
  "currencyConversion": {
    "fromCurrency": "EUR",
    "toCurrency": "USD",
    "exchangeRate": "1.0850",
    "originalAmount": "50000000",
    "convertedAmount": "54250000"
  },
  "status": "COMPLETED"
}
```

**Response** (Error):

```json
{
  "error": "Disbursement failed",
  "details": "Insufficient loan balance available for disbursement",
  "loanId": "9876543210987654321",
  "requestedAmount": "50000000",
  "availableBalance": "25000000"
}
```

## Implementation Details

### Disbursement Process Flow

1. **Validation Phase**
   - Verify loan account exists and is active
   - Check target account exists and can receive funds
   - Validate disbursement amount against available balance
   - Confirm currency compatibility or conversion requirements

2. **Currency Conversion** (if needed)
   - Apply exchange rate for cross-currency disbursements
   - Calculate converted amounts with proper precision
   - Log conversion details for audit trail

3. **Fund Transfer**
   - Execute transfer from loan account to target account
   - Update loan balance and disbursement records
   - Generate unique transfer and disbursement identifiers

4. **Audit and Logging**
   - Record all disbursement details
   - Log currency conversion information
   - Update loan servicing records

### Currency Conversion

#### Supported Currencies

- EUR (Euro)
- USD (US Dollar)
- GBP (British Pound)
- NOK (Norwegian Krone)
- SEK (Swedish Krona)
- DKK (Danish Krone)
- JPY (Japanese Yen)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)
- CHF (Swiss Franc)

#### Exchange Rate Handling

```json
{
  "currencyConversion": {
    "fromCurrency": "EUR",
    "toCurrency": "USD",
    "exchangeRate": "1.0850",
    "originalAmount": "50000000",
    "convertedAmount": "54250000",
    "conversionDate": "2024-01-01T12:00:00.000Z",
    "rateSource": "ECB_DAILY"
  }
}
```

#### Conversion Precision

- Exchange rates support up to 6 decimal places
- Amount calculations preserve cent precision
- Rounding follows banking industry standards (round half to even)

### Validation Rules

#### Loan Account Validation

- Loan account must exist and be active
- Loan must have available balance for disbursement
- Account must be in good standing (not in default)
- Disbursement limits must not be exceeded

#### Target Account Validation

- Target account must exist and be active
- Account must be able to receive credits
- Cross-customer transfers require proper authorization
- Currency compatibility or conversion support required

#### Amount Validation

- Amount must be positive integer (cents)
- Cannot exceed available loan balance
- Must respect any disbursement limits or restrictions
- Minimum disbursement amounts may apply

### Error Codes

#### Common Error Scenarios

- `LOAN_NOT_FOUND`: Specified loan account does not exist
- `LOAN_INSUFFICIENT_BALANCE`: Not enough funds available for disbursement
- `TARGET_ACCOUNT_NOT_FOUND`: Target account does not exist
- `CURRENCY_CONVERSION_FAILED`: Currency conversion could not be completed
- `DISBURSEMENT_LIMIT_EXCEEDED`: Amount exceeds maximum disbursement limit
- `LOAN_ACCOUNT_INACTIVE`: Loan account is not in active status

## Testing

### Integration Tests

The loan funding system includes comprehensive test coverage:

```bash
# Run loan funding tests
npm test tests/integration/fast-loan-funding.test.ts

# Run full integration test suite
npm run test:integration --workspace=@core-poc/core-api
```

### Test Scenarios Covered

#### Basic Disbursement Tests

- Successful disbursement to valid target account
- Validation error handling for invalid inputs
- Loan not found scenarios
- Insufficient balance handling

#### Currency Conversion Tests

- Same currency disbursements (no conversion)
- Cross-currency disbursements with conversion
- Exchange rate application and precision
- Conversion error scenarios

#### Edge Cases

- Maximum disbursement amounts
- Minimum disbursement limits
- Account status validations
- Concurrent disbursement handling

### Test Data

```typescript
// Example test loan creation
const loanAccount = await createLoanAccount({
  customerId: 'CUSTOMER-LOAN-TEST',
  currency: 'EUR',
  principalAmount: '10000000', // €100,000
  interestRate: '5.5',
  termMonths: '60',
  loanType: 'ANNUITY',
  paymentFrequency: 'MONTHLY',
});

// Example disbursement test
const disbursement = await disburseLoan({
  loanId: loanAccount.accountId,
  targetAccountId: targetAccount.accountId,
  amount: '5000000', // €50,000
  description: 'Test disbursement',
});
```

## Production Considerations

### Security

- All disbursement operations require proper authentication
- Multi-level approval workflows for large disbursements
- Audit trails for regulatory compliance
- Sensitive financial data encryption

### Monitoring

- Disbursement processing metrics and alerts
- Exchange rate monitoring for currency conversions
- Failed disbursement tracking and investigation
- Loan portfolio balance monitoring

### Compliance

- Regulatory reporting for loan disbursements
- Anti-money laundering (AML) checks
- Know Your Customer (KYC) verification
- Loan documentation and audit requirements

### Performance

- Optimized for high-volume disbursement processing
- Efficient currency conversion caching
- Database optimization for loan portfolio queries
- Scalable architecture for growing loan volumes

## Configuration

### Environment Variables

```bash
# Loan funding configuration
LOAN_MAX_DISBURSEMENT_AMOUNT=100000000  # $1M limit
LOAN_MIN_DISBURSEMENT_AMOUNT=100        # $1 minimum
CURRENCY_CONVERSION_ENABLED=true
EXCHANGE_RATE_PROVIDER=ECB_DAILY

# Audit and logging
LOAN_AUDIT_ENABLED=true
DISBURSEMENT_LOG_LEVEL=info
```

### Exchange Rate Configuration

```json
{
  "exchangeRates": {
    "provider": "ECB_DAILY",
    "updateFrequency": "DAILY",
    "fallbackRates": {
      "EUR_USD": "1.0800",
      "EUR_GBP": "0.8600",
      "EUR_NOK": "11.50"
    },
    "precision": 6,
    "roundingMode": "ROUND_HALF_TO_EVEN"
  }
}
```

## Examples

### Example 1: Simple Same-Currency Disbursement

```bash
curl -X POST http://localhost:7001/api/v1/loans/9876543210987654321/disburse \
  -H "Content-Type: application/json" \
  -d '{
    "targetAccountId": "1234567890123456789",
    "amount": "25000000",
    "description": "First disbursement for home construction"
  }'
```

### Example 2: Cross-Currency Disbursement with Conversion

```bash
curl -X POST http://localhost:7001/api/v1/loans/9876543210987654321/disburse \
  -H "Content-Type: application/json" \
  -d '{
    "targetAccountId": "1234567890123456789",
    "amount": "50000000",
    "description": "International project funding",
    "currencyConversion": {
      "fromCurrency": "EUR",
      "toCurrency": "USD",
      "exchangeRate": "1.0850",
      "convertedAmount": "54250000"
    }
  }'
```

### Example 3: Progressive Construction Loan Disbursement

```bash
# First disbursement - Foundation
curl -X POST http://localhost:7001/api/v1/loans/9876543210987654321/disburse \
  -H "Content-Type: application/json" \
  -d '{
    "targetAccountId": "1234567890123456789",
    "amount": "15000000",
    "description": "Construction phase 1: Foundation and groundwork"
  }'

# Second disbursement - Framing
curl -X POST http://localhost:7001/api/v1/loans/9876543210987654321/disburse \
  -H "Content-Type: application/json" \
  -d '{
    "targetAccountId": "1234567890123456789",
    "amount": "20000000",
    "description": "Construction phase 2: Framing and structural work"
  }'
```

## Business Workflows

### Construction Loan Workflow

1. **Loan Approval**: Initial loan approval for total project cost
2. **Progressive Disbursements**: Funds released based on construction milestones
3. **Inspection and Approval**: Each phase requires inspection before disbursement
4. **Final Disbursement**: Remaining funds released upon project completion

### Line of Credit Workflow

1. **Credit Line Establishment**: Set maximum credit limit
2. **On-Demand Disbursements**: Customer requests funds as needed
3. **Available Balance Tracking**: Monitor remaining credit capacity
4. **Repayment and Re-borrowing**: Funds become available again after repayment

### International Lending Workflow

1. **Multi-Currency Loan Setup**: Loan in one currency, disbursement in another
2. **Exchange Rate Lock**: Optionally lock exchange rates for disbursements
3. **Currency Conversion**: Automatic conversion at disbursement time
4. **Hedging Support**: Integration with currency hedging strategies

## Integration Points

### Account Management

- Integration with account creation and management systems
- Balance validation and update processes
- Account status monitoring and restrictions

### Payment Processing

- Connection to payment rails for fund transfers
- Settlement and clearing integration
- Payment confirmation and reconciliation

### Risk Management

- Credit limit monitoring and enforcement
- Loan-to-value ratio calculations
- Collateral value tracking and updates

### Regulatory Reporting

- Loan origination and disbursement reporting
- Currency conversion documentation
- Audit trail maintenance for examinations

## Troubleshooting

### Common Issues

#### Disbursement Validation Failures

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "amount",
      "message": "Amount must be a valid number",
      "code": "custom"
    }
  ]
}
```

**Solution**: Ensure amounts are provided as string integers representing cents.

#### Loan Not Found Errors

```json
{
  "error": "Loan account 999999999999999999 not found"
}
```

**Solution**: Verify the loan ID exists and is accessible.

#### Insufficient Balance

```json
{
  "error": "Disbursement failed",
  "details": "Insufficient loan balance available for disbursement",
  "availableBalance": "25000000"
}
```

**Solution**: Check available loan balance before disbursement.

### Debugging

```bash
# View loan funding logs
tail -f apps/core-api/logs/combined.log | grep "loan"

# Check specific disbursement
grep "DISB-20241201-001" apps/core-api/logs/combined.log

# Monitor disbursement metrics
curl http://localhost:7001/metrics | grep loan_disbursement
```

## Related Documentation

- [API Usage Guide](./API_USAGE.md)
- [External Transactions](./EXTERNAL_TRANSACTIONS.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Development Guide](./DEVELOPMENT.md)
- [Configuration Guide](./CONFIGURATION.md)
