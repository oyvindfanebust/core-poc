# Banking Ledger POC

Core banking system using TigerBeetle ledger, Node.js, TypeScript, and PostgreSQL.

## Project Overview

- **Domain**: Banking operations (accounts, transfers, loans, SEPA payments)
- **Stack**: Node.js, TypeScript, TigerBeetle, PostgreSQL, Next.js
- **Architecture**: Domain-driven design with clean separation of concerns
- **Test Customer**: `CUSTOMER-ABC-123`

## Essential Commands

### Development

```bash
npm run dev              # Start all services (recommended)
npm run dev:backend      # Backend only (Core API + Batch Processor)
npm run dev:frontend     # Frontend only (Customer UI)
docker-compose up -d     # Start infrastructure (PostgreSQL, TigerBeetle)
direnv allow             # Reload environment variables
```

### Pre-commit Validation

```bash
npm run build            # TypeScript compilation check
npm run lint             # ESLint validation
npm test                 # Fast tests (unit + integration)
npm run test:all         # Full test suite including slow tests
```

### Code Quality

```bash
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format with Prettier
npm run format:check     # Check formatting
```

## GitHub Issue Workflow

### Task Management Process

1. **Read Issue**: Understand requirements and acceptance criteria
2. **Mark In Progress**: Update issue status on GitHub
3. **Plan**: Break down into testable steps using TodoWrite
4. **Implement**: Follow TDD Red-Green-Refactor cycle
5. **Document**: Update architecture docs (use C4 diagrams for major changes)
6. **Validate**: Complete pre-commit checklist
7. **Commit & Push**: Clean messages, no AI attribution
8. **Mark Done**: Update issue status to "done"

## Pre-commit Checklist

**Required before ANY commit:**

- [ ] `npm run build` - TypeScript compiles cleanly
- [ ] `npm run lint` - No linting errors
- [ ] `npm test` - All tests pass
- [ ] Frontend changes: All translations added (en/no/sr)
- [ ] API changes: Documentation updated
- [ ] TodoWrite tasks: Marked complete

## Architecture Principles

### Data Storage

- **TigerBeetle (ports 6000-6001)**: ALL financial transactions and balances
- **PostgreSQL (port 5432)**: Metadata only, NEVER financial data
- **Configuration**: JSON files for system account mappings

### Design Patterns

- **Domain-Driven Design**: Domain → Repository → Service → Controller
- **Repository Pattern**: Clean data access abstraction
- **Value Objects**: Type-safe Money, AccountId, CustomerId
- **Dual Account IDs**: Numeric (customer) vs prefixed strings (system)

### Data Integrity

- **Money**: Always integers (cents), never decimals
- **Validation**: Zod schemas for all API inputs
- **Idempotency**: All batch operations must be idempotent
- **SEPA**: Dedicated suspense accounts for EUR/NOK/SEK/DKK

## Key Files & Directories

### Core Services

- `packages/core-services/src/value-objects.ts` - Money, AccountId, CustomerId types
- `packages/core-services/src/tigerbeetle.service.ts` - TigerBeetle integration
- `packages/core-services/src/system-account-id.ts` - System account ID registry
- `packages/core-services/src/config/system-accounts.service.ts` - Configuration management

### Business Logic

- `packages/domain/src/services/` - Domain services (accounts, transfers, loans)
- `packages/domain/src/repositories/` - Data access interfaces

### SEPA Implementation

- `packages/core-services/src/services/sepa-suspense-account.service.ts` - SEPA accounts
- `config/system-accounts.json` - System account mappings

### Application Entry Points

- `apps/core-api/` - Main API server (port 7001)
- `apps/customer-frontend/` - Next.js frontend (port 7002)
- `apps/batch-processor/` - Background jobs (port 7003)
- `apps/*/src/services/factory.ts` - Dependency injection containers

### Configuration

- `.envrc.example` - Environment variables template
- `docker-compose.yml` - Infrastructure setup

## Development Workflow

### Explore → Plan → Code → Commit

1. **Explore**: Read relevant files to understand context and existing patterns
2. **Plan**: Use TodoWrite for complex tasks, break down into steps
3. **Test-First**: Write failing tests before implementation (TDD)
4. **Code**: Follow existing patterns, check package.json for dependencies
5. **Validate**: Run `npm run build`, `npm run lint`, `npm test`
6. **Commit**: Clean messages, NO Claude/AI attribution

### TDD Red-Green-Refactor

- **Red**: Write failing test first
- **Green**: Minimal code to pass test
- **Refactor**: Improve while keeping tests green
- **Repeat**: Continue for each feature

## Frontend Guidelines

### Technology Stack

- **Framework**: Next.js 15 with App Router
- **Internationalization**: next-intl for multi-language support
- **Styling**: Tailwind CSS with responsive design

### Internationalization Requirements

- **Languages**: English (en), Norwegian (no), Serbian (sr)
- **Hook**: `useTranslations` for all user-facing text
- **Provider**: Wrap components with `NextIntlClientProvider`
- **Files**: Translation files in `messages/[locale].json`

### Development Notes

- **Port**: 7002 (configured in package.json)
- **Routing**: App Router with locale-based URLs (/en, /no, /sr)
- **API Integration**: REST calls to core API on port 7001

## Critical Rules

### Data Integrity

- **Financial data**: TigerBeetle ONLY, never PostgreSQL
- **Money values**: Always integers (cents), never decimals
- **Batch operations**: Must be idempotent
- **System accounts**: Use configuration file, not database

### Code Quality

- **Dependencies**: Check package.json before adding new libraries
- **Tests**: Write tests FIRST (TDD), all tests must pass
- **Type safety**: TypeScript strict mode, Zod validation
- **Commits**: Run build/lint/test before committing

### Internationalization

- **Frontend text**: Add translations for all languages (en/no/sr)
- **Components**: Use NextIntlClientProvider wrapper
- **Translations**: useTranslations hook for all user-facing text

### Repository Etiquette

- **NO AI attribution**: Never add Claude/AI references to commits
- **Test data**: Use `CUSTOMER-ABC-123` for testing
- **Clear commits**: Descriptive messages, atomic changes

## Service Ports

- **6000-6001**: TigerBeetle (development/test instances)
- **7001**: Core API (main backend)
- **7002**: Customer Frontend (Next.js)
- **7003**: Batch Processor (background jobs)
- **5432**: PostgreSQL (metadata storage)
