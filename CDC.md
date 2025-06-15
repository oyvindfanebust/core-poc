# Change Data Capture (CDC) Implementation

## Overview

This project now includes real-time Change Data Capture (CDC) support using TigerBeetle's native AMQP integration. CDC enables streaming of all financial events to message brokers for real-time processing, audit trails, and external system integration.

## Architecture

```mermaid
graph LR
    TB[TigerBeetle Ledger] --> CDC[TigerBeetle CDC]
    CDC --> MQ[RabbitMQ<br/>AMQP Exchange]
    MQ --> EH[Event Handlers]
    
    EH --> BH[Banking Handler]
    EH --> AH[Audit Handler]
    EH --> CH[Custom Handlers]
    
    BH --> BL[Business Logic<br/>• Notifications<br/>• Workflows<br/>• Processing]
    AH --> AL[Audit Logs<br/>• Compliance<br/>• Reporting<br/>• Trail]
    CH --> ES[External Systems<br/>• CRM<br/>• Analytics<br/>• APIs]
    
    style TB fill:#e1f5fe
    style CDC fill:#f3e5f5
    style MQ fill:#fff3e0
    style EH fill:#e8f5e8
    style BL fill:#fce4ec
    style AL fill:#fff8e1
    style ES fill:#f1f8e9
```

## Components

### 1. CDC Service (`src/services/cdc.service.ts`)
- Connects to RabbitMQ via AMQP
- Manages event subscriptions and consumption
- Handles connection recovery and error handling
- Routes events to registered handlers

### 2. Event Handlers
- **Banking Event Handler** (`src/handlers/banking-event.handler.ts`) - Business logic processing
- **Audit Event Handler** (`src/handlers/audit-event.handler.ts`) - Compliance and audit trails

### 3. CDC Manager (`src/services/cdc-manager.service.ts`)
- Orchestrates CDC service initialization
- Registers event handlers
- Manages lifecycle (start/stop)

## Event Types

TigerBeetle streams the following event types:

| Event Type | Description |
|------------|-------------|
| `single_phase` | Regular completed transfers |
| `two_phase_pending` | Pending two-phase transfers |
| `two_phase_posted` | Posted two-phase transfers |
| `two_phase_voided` | Voided two-phase transfers |
| `two_phase_expired` | Expired two-phase transfers |

## Event Payload Structure

```json
{
  "type": "single_phase",
  "timestamp": "2024-06-15T10:30:00Z",
  "transfer": {
    "id": "123456789",
    "debit_account_id": "1001",
    "credit_account_id": "1002", 
    "amount": "1000",
    "ledger": "840",
    "code": "10",
    "user_data_128": "optional_data",
    "user_data_64": "optional_data",
    "user_data_32": "optional_data"
  },
  "accounts": [
    {
      "id": "1001",
      "debits_pending": "0",
      "debits_posted": "1000",
      "credits_pending": "0", 
      "credits_posted": "0",
      "timestamp": "2024-06-15T10:30:00Z"
    },
    {
      "id": "1002",
      "debits_pending": "0",
      "debits_posted": "0", 
      "credits_pending": "0",
      "credits_posted": "1000",
      "timestamp": "2024-06-15T10:30:00Z"
    }
  ]
}
```

## Configuration

### Environment Variables

```bash
# Enable/disable CDC
CDC_ENABLED=true

# RabbitMQ connection
AMQP_URL=amqp://guest:guest@localhost:5672

# Exchange and routing
CDC_EXCHANGE=banking-events
CDC_QUEUE=banking-queue
CDC_ROUTING_KEYS=#

# Message acknowledgment
CDC_AUTO_ACK=false
```

### Docker Compose

The system includes:
- **RabbitMQ** service with management interface
- **TigerBeetle** service for the ledger
- **TigerBeetle CDC** service for event streaming

## Usage

### Starting the System

```bash
# Copy environment variables
cp .env.example .env

# Install dependencies
npm install

# Start services
docker-compose up -d

# Start the application
npm run dev
```

### Accessing Services

- **Application**: http://localhost:3001
- **API Docs**: http://localhost:3001/api-docs
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)
- **Health Check**: http://localhost:3001/health

### Monitoring Events

You can monitor events through:

1. **RabbitMQ Management Interface**
   - Queue messages and rates
   - Exchange bindings
   - Connection status

2. **Application Logs**
   - Event processing logs
   - Error handling
   - Performance metrics

3. **Health Endpoints**
   - `/health` - Overall system health
   - `/health/ready` - Service readiness
   - `/metrics` - Application metrics

## Event Handler Development

### Creating Custom Handlers

Implement the `CDCEventHandler` interface:

```typescript
import { CDCEventHandler, TransferEvent } from '../types/cdc.js';

export class CustomEventHandler implements CDCEventHandler {
  async handleTransferEvent(event: TransferEvent): Promise<void> {
    // Your custom logic here
    console.log('Processing event:', event.type);
  }
}
```

### Registering Handlers

Add handlers in `src/services/cdc-manager.service.ts`:

```typescript
// Register for specific event types
this.cdcService.registerHandler('single_phase', customHandler);

// Register for all events
this.cdcService.registerHandler('*', customHandler);
```

## Use Cases

### 1. Real-time Notifications
- Send push notifications for transfers
- Email/SMS alerts for large transactions
- WebSocket updates to client applications

### 2. Audit and Compliance
- Complete audit trail of all transactions
- Regulatory reporting
- Fraud detection and monitoring

### 3. External System Integration
- Sync with CRM systems
- Update ERP systems
- Third-party analytics platforms

### 4. Business Process Automation
- Invoice payment processing
- Loan payment handling
- Account reconciliation

## Error Handling

The CDC system includes robust error handling:

- **Connection Recovery**: Automatic reconnection on network issues
- **Message Retry**: Failed messages are requeued for retry
- **Dead Letter Queues**: Persistent failures can be routed to DLQ
- **Circuit Breaker**: Prevents cascade failures

## Monitoring and Observability

### Metrics Available

- Event processing rates
- Error rates and types
- Queue depths and processing times
- Connection health

### Logging

Events are logged with structured data:

```json
{
  "level": "info",
  "message": "Processing banking event",
  "type": "single_phase", 
  "transferId": "123456789",
  "amount": "1000",
  "timestamp": "2024-06-15T10:30:00Z"
}
```

## Testing

CDC is disabled in test environments by default. To test CDC functionality:

1. Set `CDC_ENABLED=true` in test config
2. Use test containers for RabbitMQ
3. Mock event handlers for unit tests

## Security Considerations

- Use secure AMQP connections (amqps://) in production
- Implement proper authentication and authorization
- Encrypt sensitive data in event payloads
- Monitor for suspicious event patterns

## Performance

- Events are processed asynchronously
- Multiple handlers can process events in parallel
- Queue batching reduces network overhead
- Connection pooling optimizes resource usage

## Troubleshooting

### Common Issues

1. **CDC Not Starting**
   - Check `CDC_ENABLED=true`
   - Verify RabbitMQ is running
   - Check AMQP connection URL

2. **Events Not Being Processed**
   - Verify TigerBeetle CDC container is running
   - Check exchange and queue bindings
   - Monitor RabbitMQ logs

3. **High Event Latency**
   - Check queue consumer count
   - Monitor system resources
   - Consider scaling handlers

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug
```

This provides detailed information about:
- Event consumption
- Handler execution
- Connection management
- Error details