# Core POC using TigerBeetle

Banking ledger PoC with Node.js, TypeScript, TigerBeetle, and PostgreSQL.

## Key Commands
```bash
npm run dev          # Start development server
npm run build        # TypeScript compilation check
npm test             # Run all tests
docker-compose up -d # Start infrastructure
```

## Before Committing
Always run: `npm run build && npm test`

## Architecture Rules
- All financial transactions MUST go through TigerBeetle
- PostgreSQL is for metadata only, not financial data
- Use Zod schemas for all API input validation
- Follow existing patterns in the codebase
- Keep domain logic in src/domain/, services in src/services/

## Code Style
- TypeScript strict mode
- async/await over callbacks
- Handle errors with try/catch
- Use existing error classes from src/utils/errors.ts
- Test files co-located as *.test.ts

## Adding Features
1. Domain model → Repository → Service → Controller
2. Add Zod validation schemas
3. Write tests
4. Update API docs if adding endpoints

## Frontend Development
- Frontend runs on port 3003: `npm run dev:frontend`
- Next.js 15 with App Router
- Internationalization with next-intl (English, Norwegian, Serbian)
- All client components need NextIntlClientProvider context
- Use `useTranslations` hook for i18n in components
- Language switching via URL: `/en`, `/no`, `/sr` (always prefixed)
- Middleware uses localePrefix: 'always' for consistent routing

## Environment
- See .envrc.example for required variables
- Migrations run automatically on startup

## Important
- Always use the context7 tool for developer docs
- Money amounts are integers (cents)
- CDC events must be idempotent
- Never log sensitive financial data
- Don't add references like "edited by Claude" in commit messages