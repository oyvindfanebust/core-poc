# Core POC using TigerBeetle

Banking ledger PoC with Node.js, TypeScript, TigerBeetle, and PostgreSQL.

## 🚀 Quick Commands
```bash
npm run dev:all          # Start all services
npm run build            # TypeScript check (run before commits)
npm run test:core-api    # Test core API
npm run test:batch-processor  # Test batch processor
docker-compose up -d     # Start infrastructure
direnv allow            # Reload env after .envrc changes
```

## ✅ Task Completion Checklist
**Before marking ANY task complete:**
1. `npm run build` - TypeScript compiles
2. `npm run test:*` - All tests pass
3. Frontend changes → Add translations (`/en`, `/no`, `/sr`)
4. API changes → Update docs
5. TodoWrite tasks → Mark complete

## 🏗️ Architecture
- **TigerBeetle (6000)**: ALL financial transactions
- **PostgreSQL**: Metadata only, NEVER financial data
- **Validation**: Zod schemas for all API inputs
- **Money**: Always integers (cents), never decimals
- **Design**: Domain → Repository → Service → Controller

## 📁 Key Files
- `packages/core-services/src/value-objects.ts` - Money, AccountId types
- `packages/domain/src/services/` - Business logic
- `apps/*/src/services/factory.ts` - Service containers
- `.envrc.example` - Environment template

## 🔧 Development Workflow
1. **Explore** - Read files, understand context
2. **Plan** - Use TodoWrite for complex tasks
3. **Code** - Follow existing patterns, check package.json
4. **Test** - TDD when possible, verify with curl
5. **Commit** - Clear messages, NO Claude/AI attribution lines

## 🎨 Frontend
- Next.js 15, App Router (port 7002)
- i18n required: English, Norwegian, Serbian
- `useTranslations` hook for all text
- Components need `NextIntlClientProvider`

## ⚠️ Critical Rules
- Financial data → TigerBeetle ONLY
- New library → Check package.json first
- Frontend text → Add ALL translations
- Commits → Run build & tests first
- Batch ops → Must be idempotent
- Test customer: `CUSTOMER-ABC-123`
- **NEVER add Claude/AI attribution to commits**

## 🔌 Ports
- 6000-6001: TigerBeetle (dev/test)
- 7001: Core API
- 7002: Customer Frontend  
- 7003: Batch Processor
- 5432: PostgreSQL