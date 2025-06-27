# SEPA Mock Service

A Next.js application that simulates external SEPA banking infrastructure for testing the Core API SEPA endpoints.

## Overview

The SEPA Mock Service provides a web interface to:

- Simulate incoming SEPA transfers from external banks
- Process outgoing SEPA transfers (approve/reject)
- Monitor SEPA suspense account balances
- Test SEPA functionality end-to-end

## Features

### 🏦 Mock Bank Simulation

- **10 realistic European banks** across 4 SEPA currencies
- **Automatic IBAN generation** for each bank
- **Realistic BIC codes** and bank information

### 📥 Incoming Transfer Simulation

- Select from any mock bank to send money
- Target customer accounts with SEPA currencies
- Configurable transfer amounts and messages
- Multiple urgency levels (STANDARD, EXPRESS, INSTANT)

### 📤 Outgoing Transfer Processing

- View pending outgoing transfers in suspense accounts
- Simulate external bank acceptance/rejection
- Monitor transfer settlement status
- Real-time balance updates

### 📊 Balance Monitoring

- Real-time SEPA suspense account balances
- Separate tracking for outgoing, incoming, and settlement accounts
- Multi-currency support (EUR, NOK, SEK, DKK)
- Auto-refresh every 30 seconds

## Supported Mock Banks

### Norwegian Banks (NOK)

- **DNB Bank ASA** (DNBANOKK)
- **Nordea Bank Norge** (NDEANOKKXXX)

### Swedish Banks (SEK)

- **Swedbank AB** (SWEDSESS)
- **Svenska Handelsbanken** (HANDSESS)

### Danish Banks (DKK)

- **Danske Bank A/S** (DABADKKK)
- **Jyske Bank A/S** (JYBADKKK)

### Eurozone Banks (EUR)

- **Deutsche Bank AG** (DEUTDEFF)
- **BNP Paribas** (BNPAFRPP)
- **ING Bank N.V.** (INGBNL2A)
- **Banco Santander S.A.** (BSCHESMM)

## Architecture

### Integration with Core API

- **API Client**: Connects to Core API SEPA endpoints (port 7001)
- **Real-time Data**: Fetches live suspense account balances
- **Transfer Processing**: Creates actual SEPA transfers via Core API

### Mock Bank Data

- **Realistic Configuration**: European banks with proper BIC codes
- **IBAN Generation**: Creates valid IBAN patterns for each country
- **Currency Mapping**: Each bank supports its native currency

## Getting Started

### Prerequisites

- Core API running on port 7001
- SEPA suspense accounts initialized in TigerBeetle
- Customer accounts available for testing

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev:sepa-mock-service
```

The service will be available at: **http://localhost:7006**

### Environment Configuration

Copy `.env.local.example` to `.env.local` and configure:

```env
# Core API URL
NEXT_PUBLIC_CORE_API_URL=http://localhost:7001
```

## Usage Workflow

### 1. Test Outgoing SEPA Transfers

1. **Initiate Transfer**: Use the customer frontend (port 7002) to create a SEPA transfer
2. **Monitor Suspense**: Check the mock service to see funds in outgoing suspense
3. **Process Transfer**: Use the "Outgoing Transfers" page to approve/reject
4. **Verify Settlement**: Check balance changes in suspense accounts

### 2. Simulate Incoming Transfers

1. **Select Bank**: Choose from any of the 10 mock banks
2. **Enter Details**: Specify target account and transfer amount
3. **Submit Transfer**: Creates incoming transfer via Core API
4. **Verify Receipt**: Check customer account balance in frontend

### 3. Monitor System Health

1. **SEPA Status**: Dashboard shows Core API SEPA service status
2. **Account Balances**: Real-time suspense account monitoring
3. **Transfer History**: Track all SEPA transfer activity

## API Integration

### Core API Endpoints Used

- `POST /sepa/transfers/outgoing` - Create SEPA transfers
- `GET /sepa/status` - Service health check
- `GET /sepa/suspense/{currency}` - Account balances
- `GET /customers/{id}/accounts` - Customer account lookup
- `GET /accounts/{id}/balance` - Account balance validation

### Error Handling

- **Connection Issues**: Clear error messages for API connectivity
- **Validation Errors**: Form validation for transfer inputs
- **Service Degradation**: Graceful handling of Core API issues

## Development

### Project Structure

```
apps/sepa-mock-service/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── page.tsx        # Main dashboard
│   │   ├── incoming/       # Incoming transfer simulation
│   │   ├── outgoing/       # Outgoing transfer processing
│   │   └── balances/       # Balance monitoring
│   ├── components/         # Reusable React components
│   ├── config/            # Mock bank configuration
│   │   └── mock-banks.ts   # Bank data and IBAN generation
│   └── lib/               # Utilities and API client
│       └── core-api-client.ts
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

### Scripts

```bash
npm run dev          # Start development server (port 7006)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript validation
```

## Testing Scenarios

### Basic SEPA Transfer Test

1. Create customer account with EUR balance
2. Initiate SEPA transfer to any European IBAN
3. Verify funds move to outgoing suspense
4. Approve transfer in mock service
5. Check final settlement balance

### Multi-Currency Testing

1. Create accounts in all SEPA currencies (EUR, NOK, SEK, DKK)
2. Test transfers within same currency
3. Monitor separate suspense accounts per currency
4. Verify proper currency isolation

### Error Scenario Testing

1. Insufficient balance transfers
2. Invalid IBAN formats
3. Unsupported currencies
4. Network connectivity issues

## Limitations

### Current Implementation

- **Simulation Only**: Does not connect to real SEPA networks
- **Mock Processing**: Transfer approval/rejection is simulated
- **No Persistence**: Mock service state resets on restart
- **Simple Validation**: Basic IBAN format checking only

### Future Enhancements

- **Transfer History**: Persistent storage of mock transfers
- **Advanced Scenarios**: Configurable delay and failure rates
- **Batch Processing**: Multiple transfer handling
- **Real IBAN Validation**: Checksum verification
- **Admin Interface**: Bank configuration management

## Contributing

When adding new mock banks:

1. Add bank configuration to `mock-banks.ts`
2. Include proper BIC code and country
3. Implement IBAN generation pattern
4. Test with actual transfers

When adding new features:

1. Follow existing component patterns
2. Update API client types
3. Add error handling
4. Document usage in README
