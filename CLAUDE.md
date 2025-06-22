# Core POC using TigerBeetle

Banking ledger PoC with Node.js, TypeScript, TigerBeetle, and PostgreSQL.

## Bash Commands
- `npm run dev`: Start backend development server (port 7001)
- `npm run dev:frontend`: Start frontend development server (port 7002)
- `npm run dev:all`: Start both backend and frontend concurrently
- `npm run build`: TypeScript compilation check (always run before committing)
- `npm test`: Run all tests
- `npm run test:unit --workspace=backend`: Run unit tests only
- `docker-compose up -d`: Start infrastructure services
- `docker-compose down`: Stop all services
- `direnv allow`: Reload environment variables after .envrc changes

## Core Files
- `src/utils/errors.ts`: Custom error classes for the application
- `src/validation/schemas.ts`: Zod schemas for API input validation
- `backend/src/services/factory.ts`: Service container and dependency injection
- `shared/src/types/index.ts`: Shared TypeScript type definitions
- `backend/src/config/validation.ts`: Environment configuration validation
- `docker-compose.yml`: Infrastructure service definitions
- `.envrc`: Environment variables (use .envrc.example as template)

## Architecture Rules
- All financial transactions MUST go through TigerBeetle (port 6000)
- PostgreSQL is for metadata only, never financial data
- Use Zod schemas for all API input validation
- Follow domain-driven design: Domain → Repository → Service → Controller
- Keep domain logic in `src/domain/`, services in `src/services/`

## Code Style
- TypeScript strict mode enabled
- Use async/await over callbacks
- Handle errors with try/catch blocks
- Use existing error classes from `src/utils/errors.ts`
- Test files co-located as `*.test.ts`
- No comments unless explicitly requested

## Port Management
- **600x range**: Database/ledger services (6000: TigerBeetle dev, 6001: TigerBeetle test)
- **700x range**: Application services (7001: Backend API, 7002: Frontend)
- **5xxx range**: Infrastructure (5432: PostgreSQL, 5672: RabbitMQ)

## Frontend Development
- Next.js 15 with App Router on port 7002
- Internationalization: English, Norwegian, Serbian (`/en`, `/no`, `/sr`)
- All client components need NextIntlClientProvider context
- Use `useTranslations` hook for i18n in components
- Language switching always uses URL prefixes

## Environment Setup
- Copy `.envrc.example` to `.envrc` and customize
- Run `direnv allow` after changes
- Database migrations run automatically on startup
- Use test customer: `CUSTOMER-ABC-123`

## Repository Etiquette
- Always run `npm run build && npm test` before committing
- Write descriptive commit messages (see git log for style)
- Don't reference "Claude" or "AI" in commit messages
- Stage all changes: `git add -A`
- Push to main branch after commits

## Testing Strategy
- Run unit tests first: `npm run test:unit --workspace=backend`
- Stop/restart services for clean testing environment
- Test API endpoints with curl before frontend testing
- Use Puppeteer for end-to-end frontend testing
- Verify service connectivity and port bindings

## Unexpected Behaviors
- **direnv**: Must run `direnv allow` after .envrc changes, environment won't update automatically
- **TigerBeetle**: Uses BigInt for IDs, requires special JSON serialization (handled in app.ts)
- **Docker**: Services may need restart after port changes, use `docker-compose down && docker-compose up -d`
- **Frontend CORS**: Backend only allows frontend on port 7002, update CORS if frontend port changes
- **Money amounts**: Always integers representing cents, never decimals
- **CDC events**: Must be idempotent, can be replayed

## Security Notes
- Never log sensitive financial data
- CDC events may contain financial information
- Use secure AMQP connections in production
- Money amounts in cents prevent floating-point errors

## Key Utilities
- `src/domain/value-objects.ts`: Money, AccountId, CustomerId type-safe wrappers
- `src/services/tigerbeetle.service.ts`: TigerBeetle client wrapper
- `src/middleware/validation.ts`: Request validation middleware
- `backend/src/utils/logger.ts`: Winston structured logging