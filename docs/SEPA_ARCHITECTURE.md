# SEPA Payment Infrastructure Architecture

This document describes the SEPA (Single Euro Payments Area) payment infrastructure implementation in the Core POC banking system.

## Overview

The SEPA infrastructure enables processing of EUR, NOK, SEK, and DKK payments through dedicated system accounts and services. It implements a clean separation between customer accounts and system accounts while maintaining all financial data in TigerBeetle.

## System Account Architecture

### Dual Account ID Scheme

The system implements two types of account identifiers:

#### Customer Accounts

- **Format**: Numeric IDs (e.g., `123456789012345678`)
- **Generation**: TigerBeetle auto-generated bigint values
- **Usage**: All customer deposit, loan, and credit accounts
- **Storage**: Account metadata in PostgreSQL, financial data in TigerBeetle

#### System Accounts

- **Format**: Prefixed string identifiers (e.g., `SEPA-OUT-SUSPENSE-EUR`)
- **Generation**: Predetermined naming scheme based on account type and currency
- **Usage**: Internal system operations, SEPA processing, external bank interactions
- **Storage**: Mappings in configuration file, financial data in TigerBeetle

### SEPA System Account Types

The system creates the following SEPA-specific accounts for each supported currency (EUR, NOK, SEK, DKK):

1. **Outgoing Suspense**: `SEPA-OUT-SUSPENSE-{CURRENCY}`
   - Temporary holding for outgoing SEPA transfers
   - Liability account type in TigerBeetle

2. **Incoming Suspense**: `SEPA-IN-SUSPENSE-{CURRENCY}`
   - Temporary holding for incoming SEPA transfers
   - Liability account type in TigerBeetle

3. **Settlement**: `SEPA-SETTLEMENT-{CURRENCY}`
   - Final settlement account for SEPA operations
   - Liability account type in TigerBeetle

## Configuration-Based Persistence

### System Account Config Service

The `SystemAccountConfigService` manages system account mappings through a JSON configuration file instead of database tables.

#### Benefits of Configuration File Approach:

- **Simplicity**: Reduces database dependencies for system account management
- **Portability**: Configuration can be easily backed up and migrated
- **Performance**: In-memory caching with file-based persistence
- **Atomic Updates**: File operations ensure consistency

#### Configuration File Structure

```json
{
  "version": "1.0",
  "lastUpdated": "2024-01-01T00:00:00.000Z",
  "accounts": {
    "SEPA-OUT-SUSPENSE-EUR": {
      "tigerBeetleId": "123456789",
      "accountType": "SEPA_OUTGOING_SUSPENSE",
      "currency": "EUR",
      "description": "SEPA outgoing transfer suspense account for EUR",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### File Location

- **Development**: `config/system-accounts.json` (project root)
- **Production**: Configurable path through constructor parameter
- **Template**: `config/system-accounts.json.template` for initial setup

### Atomic File Operations

The service implements atomic file operations to ensure data consistency:

1. **Write to temporary file**: `system-accounts.json.tmp`
2. **Atomic rename**: Move temp file to final location
3. **Cleanup on failure**: Remove temp file if operation fails

## SEPA Transfer Flow

### Outgoing SEPA Transfer

1. **Customer Initiates Transfer**
   - Customer account debited
   - Amount moves to SEPA outgoing suspense account

2. **SEPA Processing**
   - Funds held in outgoing suspense
   - SEPA message created and sent

3. **Settlement**
   - Funds move from outgoing suspense to settlement account
   - External bank credited through SEPA network

```
Customer Account → SEPA Outgoing Suspense → SEPA Settlement → External Bank
```

### Incoming SEPA Transfer

1. **SEPA Message Received**
   - Funds arrive in SEPA settlement account

2. **Processing**
   - Funds move to incoming suspense account
   - Transfer validation and processing

3. **Customer Credit**
   - Funds move from incoming suspense to customer account
   - Customer notified of incoming transfer

```
External Bank → SEPA Settlement → SEPA Incoming Suspense → Customer Account
```

## Service Layer Architecture

### SEPASuspenseAccountService

Core service responsible for SEPA account management:

- **Account Creation**: Creates SEPA suspense accounts in TigerBeetle
- **Mapping Management**: Stores system identifier to numeric ID mappings
- **Currency Validation**: Ensures only SEPA currencies are processed
- **Initialization**: Automatically creates all required SEPA accounts

#### Key Methods:

```typescript
// Create a specific SEPA suspense account
async createSEPASuspenseAccount(
  type: 'OUTGOING_SUSPENSE' | 'INCOMING_SUSPENSE' | 'SETTLEMENT',
  currency: 'EUR' | 'NOK' | 'SEK' | 'DKK'
): Promise<bigint>

// Initialize all SEPA accounts for all currencies
async initializeAllSEPASuspenseAccounts(): Promise<void>

// Load mappings from configuration into memory
async loadSystemAccountMappings(): Promise<void>

// Get numeric ID for SEPA account
async getSEPASuspenseAccountNumericId(
  type: string,
  currency: string
): Promise<bigint>
```

### SystemAccountConfigService

Configuration management service:

- **File Operations**: Read/write system account configurations
- **Validation**: Ensure configuration file integrity
- **Atomic Updates**: Safe concurrent access to configuration
- **Backup Support**: Export/import capabilities

#### Key Methods:

```typescript
// Initialize service and load configuration
async initialize(): Promise<void>

// Add new system account mapping
async addSystemAccount(
  systemIdentifier: string,
  tigerBeetleId: string,
  accountType: string,
  currency: string,
  description: string
): Promise<void>

// Get system account by identifier
getSystemAccount(systemIdentifier: string): SystemAccountEntry | null

// Validate configuration integrity
async validateConfig(): Promise<{ valid: boolean; errors: string[] }>
```

## Memory Management

### System Account ID Registry

The system maintains an in-memory cache of system account mappings for performance:

```typescript
// Global registry for fast lookups
const systemAccountMappings = new Map<string, bigint>();

// Register mapping in cache
export function registerSystemAccountId(systemIdentifier: string, numericId: bigint): void;

// Get numeric ID from cache
export function getSystemAccountNumericId(systemIdentifier: string): bigint | undefined;
```

### Initialization Flow

1. **Service Factory Creation**
   - `SystemAccountConfigService.initialize()` loads configuration
   - `SEPASuspenseAccountService.loadSystemAccountMappings()` populates cache
   - `SEPASuspenseAccountService.initializeAllSEPASuspenseAccounts()` creates missing accounts

2. **Runtime Operations**
   - Fast in-memory lookups for existing accounts
   - Configuration file updates for new accounts
   - Automatic cache updates on account creation

## Supported Currencies

### SEPA Currencies

- **EUR**: Euro (primary SEPA currency)
- **NOK**: Norwegian Krone
- **SEK**: Swedish Krona
- **DKK**: Danish Krone

### Currency Validation

```typescript
export function isSEPACurrency(currency: string): boolean {
  return ['EUR', 'NOK', 'SEK', 'DKK'].includes(currency);
}
```

## Error Handling

### Configuration Errors

- **File Not Found**: Automatically creates default configuration
- **Invalid JSON**: Throws descriptive error messages
- **Missing Fields**: Validation catches incomplete configurations
- **Duplicate Accounts**: Prevents overwriting existing mappings

### TigerBeetle Errors

- **Account Creation Failures**: Propagated to caller with context
- **Invalid Account Types**: Validation before TigerBeetle calls
- **Currency Mismatches**: Early validation prevents inconsistencies

## Testing Strategy

### Unit Tests

- **SystemAccountConfigService**: File operations, validation, error handling
- **SEPASuspenseAccountService**: Account creation, mapping management
- **System Account ID Functions**: Identifier generation and validation

### Integration Tests

- **End-to-End Flows**: Complete SEPA transfer scenarios
- **Service Factory**: Proper initialization and dependency injection
- **Configuration Persistence**: File-based operations with real filesystem

### Mock Strategy

- **File System Operations**: Mocked for unit tests
- **TigerBeetle Service**: Mocked for isolated testing
- **Configuration Service**: Real implementation for integration tests

## Future Enhancements

### Configuration Versioning

- Schema versioning for configuration format
- Migration utilities for configuration updates
- Backward compatibility support

### Advanced SEPA Features

- Real-time payment processing
- SEPA instant payments support
- Enhanced fraud detection
- Multi-bank connectivity

### Performance Optimizations

- Configuration file compression
- Lazy loading of mappings
- Memory usage optimization
- Concurrent access improvements

## Security Considerations

### File System Security

- **Access Control**: Configuration files require appropriate permissions
- **Backup Encryption**: Sensitive mapping data should be encrypted at rest
- **Audit Trail**: Log all configuration changes

### Data Integrity

- **Atomic Operations**: File updates use atomic rename operations
- **Validation**: Comprehensive configuration validation
- **Recovery**: Template file for disaster recovery scenarios

## Monitoring and Observability

### Metrics

- System account creation rates
- Configuration file update frequency
- Cache hit/miss ratios for system account lookups

### Logging

- Configuration file operations
- System account creation events
- SEPA transfer processing steps
- Error conditions and recovery actions

### Health Checks

- Configuration file accessibility
- System account mapping completeness
- TigerBeetle connectivity for system accounts
