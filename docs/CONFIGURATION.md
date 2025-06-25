# Configuration Guide

This document covers environment setup, configuration options, and deployment settings.

## Environment Variables

The application uses direnv to manage environment variables. Copy `.envrc.example` to `.envrc` and customize as needed.

| Variable                 | Description                               | Default     |
| ------------------------ | ----------------------------------------- | ----------- |
| `NODE_ENV`               | Environment (development/production/test) | development |
| `PORT`                   | Server port                               | 7001        |
| `DB_HOST`                | PostgreSQL host                           | localhost   |
| `DB_PORT`                | PostgreSQL port                           | 5432        |
| `DB_NAME`                | Database name                             | banking_poc |
| `DB_USER`                | Database user                             | postgres    |
| `DB_PASSWORD`            | Database password                         | postgres    |
| `TIGERBEETLE_CLUSTER_ID` | TigerBeetle cluster ID                    | 0           |
| `TIGERBEETLE_ADDRESSES`  | TigerBeetle server addresses              | 3000        |
| `LOG_LEVEL`              | Logging level (error/warn/info/debug)     | info        |

## Environment Setup with direnv

### Installation

```bash
# Install direnv if not already installed
# macOS: brew install direnv
# Ubuntu: sudo apt install direnv
# Or visit: https://direnv.net/docs/installation.html
```

### Shell Integration

```bash
# Set up your shell hook (add to ~/.bashrc, ~/.zshrc, etc.)
# For bash: echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
# For zsh: echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
```

### Setup Process

```bash
# Copy the template and customize for your environment
cp .envrc.example .envrc
# Edit .envrc with your configuration

# Allow direnv to load the environment variables
direnv allow
```

## Development vs Production

### Development Environment

**Characteristics:**

- Detailed console logging with colors
- Background jobs run every 30-60 seconds for testing
- Swagger UI enabled
- Detailed error messages
- Hot reload enabled
- Debug logging level

**Configuration:**

```bash
NODE_ENV=development
LOG_LEVEL=debug
PORT=7001
```

### Production Environment

**Characteristics:**

- JSON structured logging to files
- Background jobs run on realistic schedules (daily/monthly)
- Reduced error details for security
- Performance optimizations
- Health check endpoints enabled
- Prometheus metrics enabled

**Configuration:**

```bash
NODE_ENV=production
LOG_LEVEL=info
PORT=7001
```

## Service Ports

- **6000-6001**: TigerBeetle (development/test instances)
- **7001**: Core API (main backend)
- **7002**: Customer Frontend (Next.js)
- **7003**: Batch Processor (background jobs)
- **5432**: PostgreSQL (metadata storage)

## Database Configuration

### Connection Settings

The application uses PostgreSQL for metadata storage. Configure database connection through environment variables:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=banking_poc
DB_USER=postgres
DB_PASSWORD=postgres
```

### Database Setup

```bash
# Create PostgreSQL database
createdb banking_poc

# Database schema will be automatically created on first run
```

## TigerBeetle Configuration

TigerBeetle is used for all financial transaction storage:

```bash
TIGERBEETLE_CLUSTER_ID=0
TIGERBEETLE_ADDRESSES=3000
```

## Logging Configuration

### Log Levels

- **error**: Error conditions only
- **warn**: Warning conditions and errors
- **info**: Informational messages, warnings, and errors (default)
- **debug**: Debug information and all above

### Development Logging

- Colored console output
- Pretty-printed JSON
- Request/response logging
- Detailed error stack traces

### Production Logging

- Structured JSON output
- Correlation IDs for request tracking
- Performance metrics
- Security event logging

## Infrastructure Setup

### Docker Compose

Start all required services:

```bash
# Start all required services (PostgreSQL, TigerBeetle, RabbitMQ)
docker-compose up -d

# Verify services are running
docker-compose ps
```

### Manual Setup

If not using Docker Compose, ensure the following services are running:

1. **PostgreSQL**: Database server for metadata
2. **TigerBeetle**: High-performance accounting database
3. **RabbitMQ**: Message queue for background jobs (optional)

## Security Configuration

### Environment Variables Security

- Never commit `.envrc` to version control
- Use different credentials for each environment
- Rotate database passwords regularly
- Use environment-specific database names

### API Security

- Input validation through Zod schemas
- Parameterized database queries
- CORS configuration for frontend integration
- Rate limiting ready for implementation

## Monitoring Configuration

### Health Checks

Health check endpoints are automatically enabled:

- `/health` - Comprehensive health status
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

### Metrics

Prometheus-compatible metrics available at:

- `/metrics` - Application metrics (JSON)
- `/metrics/prometheus` - Prometheus format

### Logging

Structured logging includes:

- Request/response correlation IDs
- Performance timing
- Error tracking with context
- Business event logging
