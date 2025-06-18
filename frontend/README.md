# Frontend - Online Banking Application

A modern customer-facing web application built with Next.js 14, TypeScript, and Tailwind CSS for the Core Banking POC.

## Features

- **Customer Authentication**: Simple customer ID-based login
- **Account Dashboard**: View all accounts and balances at a glance
- **Account Management**: Create new deposit accounts with multiple currencies
- **Money Transfers**: Transfer funds between your own accounts
- **Account Details**: View detailed account information and transaction history (coming soon)
- **Multi-Currency Support**: Support for 10 different currencies

## Tech Stack

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type safety throughout the application
- **Tailwind CSS**: Utility-first CSS framework
- **React Hook Form**: Form state management and validation
- **Zod**: Schema validation
- **SWR**: Data fetching and caching
- **Lucide React**: Beautiful icon set

## Getting Started

### Prerequisites

- Backend API must be running on port 3002
- Node.js 18+ and npm

### Development

From the root of the monorepo:

```bash
# Install dependencies
npm install

# Start the backend first
npm run dev:backend

# In another terminal, start the frontend
npm run dev:frontend

# Or run both concurrently
npm run dev:all
```

The application will be available at http://localhost:3003

### Test Credentials

Use the test customer ID: `CUSTOMER-ABC-123`

Or enter any valid customer ID (letters, numbers, hyphens, and underscores).

## Application Structure

```
app/
├── page.tsx                 # Login page
├── dashboard/              # Account overview
├── accounts/               # Account listing
│   └── [accountId]/       # Account details
├── create-account/        # New account creation
└── transfer/              # Money transfers

components/
├── navigation.tsx         # Main navigation
└── protected-layout.tsx   # Layout for authenticated pages

lib/
├── api.ts                # API type definitions
└── api-client.ts         # HTTP client wrapper

hooks/
└── use-customer.ts       # Customer authentication hook
```

## Key Features

### Account Creation
- Create deposit accounts with initial balance
- Support for 10 currencies
- Real-time validation

### Money Transfers
- Transfer between your own accounts
- Currency validation
- Success confirmation with redirect

### Account Dashboard
- Total balance calculation
- Quick access to all accounts
- Visual account type indicators

## API Integration

The frontend communicates with the backend API through:
- Direct API calls to `http://localhost:3002`
- Proper error handling
- BigInt serialization support
- Type-safe API client

## Future Enhancements

- Transaction history display
- Loan account creation
- Credit account management
- Advanced filtering and search
- Export functionality
- Real-time updates via WebSocket
