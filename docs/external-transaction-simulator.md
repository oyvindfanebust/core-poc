# External Transaction Simulator Documentation

The External Transaction Simulator provides comprehensive simulation of external payment network behaviors including SEPA, ACH, and Wire transfers for testing and development purposes. It enables testing of various payment scenarios without requiring real external bank connections.

## Overview

The External Transaction Simulator simulates:

- **SEPA transfers**: EU payment processing and validation
- **ACH transfers**: US domestic payment processing
- **Wire transfers**: International multi-currency transfers
- Bank response scenarios (success, rejection, timeouts)
- Network delays and timing behaviors
- Business rule enforcement (cut-off times, holidays, limits)
- Settlement simulation for different urgency levels

## Architecture

```
MockSEPANetworkService
├── Message Processing
│   ├── SEPA message validation
│   ├── Network delay simulation
│   └── Error injection capabilities
├── Bank Response Simulation
│   ├── Configurable bank behaviors
│   ├── Custom error scenarios
│   └── Settlement timing
└── Testing Utilities
    ├── State management
    ├── Configuration helpers
    └── Test data generators
```

## Basic Usage

### 1. Initialize Mock Service

```typescript
import { MockSEPANetworkService } from '@core-poc/domain';

const mockSEPANetwork = new MockSEPANetworkService({
  networkDelay: 100, // 100ms network delay
  errorRate: 0.05, // 5% random error rate
  timeoutRate: 0.01, // 1% timeout rate
  simulateWeekends: true, // Enable weekend processing delays
  simulateHolidays: true, // Enable holiday processing delays
  enforceCutOffTimes: true, // Enforce 15:00 CET cut-off for express
  maxDailyAmount: BigInt(1000000 * 100), // €10,000 daily limit
  maxTransactionAmount: BigInt(100000 * 100), // €1,000 per transaction
});
```

### 2. Send SEPA Messages

```typescript
import { SEPAMessage } from '@core-poc/domain';

const message: SEPAMessage = {
  messageId: 'TEST_MSG_001',
  direction: 'OUTGOING',
  amount: BigInt(10000), // €100.00 in cents
  currency: 'EUR',
  debtorIBAN: 'DE89370400440532013000',
  creditorIBAN: 'FR1420041010050500013M02606',
  urgency: 'STANDARD',
  description: 'Test payment',
  createdAt: new Date(),
};

const response = await mockSEPANetwork.sendSEPAMessage(message);
console.log('SEPA Response:', response);
```

### 3. Simulate Incoming Transfers

```typescript
const incomingMessage = await mockSEPANetwork.simulateIncomingTransfer(
  BigInt(50000), // €500.00
  'EUR',
  'FR1420041010050500013M02606', // Debtor IBAN
  'DE89370400440532013000', // Creditor IBAN
  'Incoming payment description',
);
```

## Testing Scenarios

### Error Simulation

```typescript
// Force specific errors for testing
mockSEPANetwork.injectNetworkError(SEPAErrorType.NETWORK_TIMEOUT);

// Clear forced errors
mockSEPANetwork.clearNetworkError();

// Configure random error rates
mockSEPANetwork = new MockSEPANetworkService({
  errorRate: 0.1, // 10% error rate
  timeoutRate: 0.05, // 5% timeout rate
});
```

### Custom Bank Responses

```typescript
// Add a bank that rejects all transfers
mockSEPANetwork.addBankResponse('REJECTBANK', {
  bic: 'REJECTBANK',
  accepts: false,
  delay: 1000,
  errorRate: 1.0,
  customErrors: [SEPAErrorType.BANK_REJECTION],
});

// Add a slow but reliable bank
mockSEPANetwork.addBankResponse('SLOWBANK', {
  bic: 'SLOWBANK',
  accepts: true,
  delay: 5000,
  errorRate: 0.02,
});
```

### Transfer Status Tracking

```typescript
// Send a transfer
const response = await mockSEPANetwork.sendSEPAMessage(message);

// Check status later
const transfer = await mockSEPANetwork.getTransferStatus(message.messageId);
console.log('Transfer Status:', transfer?.status); // 'PENDING', 'SETTLED', 'FAILED'

// Get all pending transfers
const allPending = mockSEPANetwork.getPendingTransfers();
console.log(`${allPending.length} transfers pending`);
```

## Error Types

The mock service supports various SEPA error scenarios:

| Error Type               | Description                            | Retryable |
| ------------------------ | -------------------------------------- | --------- |
| `INVALID_IBAN`           | Invalid IBAN format or checksum        | No        |
| `INSUFFICIENT_FUNDS`     | Not enough funds in debtor account     | Yes       |
| `ACCOUNT_CLOSED`         | Creditor account closed/suspended      | No        |
| `FRAUD_BLOCK`            | Transaction blocked by fraud detection | No        |
| `NETWORK_TIMEOUT`        | Network communication timeout          | Yes       |
| `BANK_REJECTION`         | Receiving bank rejected transaction    | No        |
| `CURRENCY_NOT_SUPPORTED` | Currency not supported for SEPA        | No        |
| `AMOUNT_LIMIT_EXCEEDED`  | Transaction exceeds amount limits      | No        |
| `CUT_OFF_TIME_EXCEEDED`  | Too late for same-day processing       | Yes       |
| `HOLIDAY_PROCESSING`     | Delayed due to weekend/holiday         | Yes       |
| `COMPLIANCE_VIOLATION`   | Violates compliance rules              | No        |

## Settlement Timing

The mock service simulates realistic settlement times:

- **INSTANT**: 10 seconds
- **EXPRESS**: 2 hours (same business day)
- **STANDARD**: Next business day

Weekend and holiday delays are automatically applied for non-instant transfers.

## Integration Testing

### Using Mock Service Factory

```typescript
import { MockSEPAServiceFactory, SEPATestHelpers } from '../mocks/mock-sepa-service-factory';

describe('SEPA Integration Tests', () => {
  let services;
  let mockSEPANetwork;

  beforeAll(async () => {
    const testServices = await MockSEPAServiceFactory.createSEPATestServices();
    services = testServices;
    mockSEPANetwork = testServices.mockSEPANetwork;
  });

  afterAll(async () => {
    await MockSEPAServiceFactory.cleanup();
  });

  beforeEach(() => {
    MockSEPAServiceFactory.resetMockSEPANetwork();
  });

  it('should process SEPA transfer', async () => {
    const message = SEPATestHelpers.createTestSEPAMessage({
      amount: BigInt(25000), // €250.00
      urgency: 'EXPRESS',
    });

    const response = await mockSEPANetwork.sendSEPAMessage(message);
    SEPATestHelpers.verifyResponseStructure(response);
    expect(response.status).toBe('ACCEPTED');
  });
});
```

### Test Helpers

```typescript
// Create test data
const message = SEPATestHelpers.createTestSEPAMessage({
  amount: BigInt(50000),
  currency: 'NOK',
  urgency: 'INSTANT',
});

// Create bank response
const bankResponse = SEPATestHelpers.createTestBankResponse({
  accepts: false,
  errorRate: 1.0,
});

// Wait for settlement
const settledTransfer = await SEPATestHelpers.waitForSettlement(
  mockSEPANetwork,
  messageId,
  5000, // 5 second timeout
);

// Batch testing
const transfers = SEPATestHelpers.createTestTransferBatch(10, BigInt(10000));
```

## Configuration Options

### Network Behavior

```typescript
interface MockNetworkConfig {
  networkDelay: number; // Base network delay in milliseconds
  errorRate: number; // Probability of random errors (0-1)
  forceError?: SEPAErrorType; // Force specific error for testing
  timeoutRate: number; // Probability of timeouts (0-1)
}
```

### Business Rules

```typescript
interface MockNetworkConfig {
  simulateWeekends: boolean; // Apply weekend processing delays
  simulateHolidays: boolean; // Apply holiday processing delays
  enforceCutOffTimes: boolean; // Enforce 15:00 CET cut-off
  maxDailyAmount: bigint; // Maximum daily transfer amount
  maxTransactionAmount: bigint; // Maximum per-transaction amount
}
```

## Performance Testing

```typescript
// Test concurrent transfers
const batchSize = 100;
const transfers = SEPATestHelpers.createTestTransferBatch(batchSize);

const promises = transfers.map(transfer => mockSEPANetwork.sendSEPAMessage(transfer));

const results = await Promise.all(promises);
const successCount = results.filter(r => r.status === 'ACCEPTED').length;
console.log(`${successCount}/${batchSize} transfers successful`);
```

## Real-World Scenarios

### Weekend Processing

```typescript
// Configure for weekend testing
const weekendService = new MockSEPANetworkService({
  simulateWeekends: true,
  enforceCutOffTimes: true,
});

// Saturday transfer should be delayed to Monday
const saturdayTransfer = await weekendService.sendSEPAMessage({
  ...baseMessage,
  urgency: 'STANDARD',
  createdAt: new Date('2024-01-06T10:00:00Z'), // Saturday
});

expect(saturdayTransfer.estimatedSettlement?.getDay()).toBe(1); // Monday
```

### Daily Limit Testing

```typescript
const limitedService = new MockSEPANetworkService({
  maxDailyAmount: BigInt(100000), // €1,000 daily limit
});

// First transfer succeeds
const transfer1 = await limitedService.sendSEPAMessage({
  ...baseMessage,
  amount: BigInt(80000), // €800
});
expect(transfer1.status).toBe('ACCEPTED');

// Second transfer exceeds daily limit
const transfer2 = await limitedService.sendSEPAMessage({
  ...baseMessage,
  amount: BigInt(30000), // €300, total €1,100
});
expect(transfer2.status).toBe('REJECTED');
expect(transfer2.errorDetails?.code).toBe(SEPAErrorType.AMOUNT_LIMIT_EXCEEDED);
```

## Best Practices

1. **Reset State**: Always reset mock state between tests to ensure isolation
2. **Use Test Helpers**: Leverage provided test helpers for consistent test data
3. **Verify Structure**: Use `verifyResponseStructure()` to validate response format
4. **Configure Appropriately**: Set realistic delays and error rates for your test scenarios
5. **Test Error Cases**: Verify both success and failure scenarios
6. **Settlement Testing**: Test different urgency levels and their settlement times

## Troubleshooting

### Common Issues

1. **Stale State**: Transfers from previous tests affecting current test
   - **Solution**: Call `MockSEPAServiceFactory.resetMockSEPANetwork()` in `beforeEach`

2. **Unrealistic Delays**: Tests taking too long due to network delays
   - **Solution**: Set low `networkDelay` values for fast test execution

3. **Random Failures**: Tests failing intermittently due to random error injection
   - **Solution**: Set `errorRate: 0` and `timeoutRate: 0` for deterministic tests

4. **Settlement Not Completing**: Waiting for settlement that never arrives
   - **Solution**: Use appropriate timeouts and check transfer status

### Debug Mode

```typescript
// Enable detailed logging
const debugService = new MockSEPANetworkService({
  networkDelay: 0,
  errorRate: 0,
  // ... other config
});

// Monitor all transfers
console.log('Pending transfers:', debugService.getPendingTransfers());
```
