# 🌱 Sprout

A beautiful budgeting app that helps you grow your finances. Built with Next.js 14, Prisma, Lucia Auth, and AI-powered assistance.

## Features

- 🤖 **AI-Powered Assistant** - Meet Bud, your personal gardener! Chat naturally to add transactions, create accounts, transfer funds, and more
- 🔐 **Secure Authentication** - Sign up and sign in with Lucia session-based auth
- 💰 **Envelope Budgets** - Organize real account balances into virtual monthly budgets and goals
- 💵 **Income Plans** - Automatically distribute recorded income with fixed, percentage, and remainder rules
- 🎯 **Goal Motivation** - See actual goal progress and the hypothetical opportunity cost of spending
- 📊 **Reports** - Explore cash flow, spending, allocation, net worth, and goal-impact charts
- 📱 **iPhone-First PWA** - Installable shell with safe-area navigation and touch-friendly workflows
- 🔄 **Easy Transfers** - Move money between accounts with one click
- 👥 **Dashboard Sharing** - Invite family or partners to view and collaborate on your finances
- ⚡ **Quick Actions** - Add transactions, transfers, and accounts from a convenient modal interface
- 🎨 **Beautiful UI** - Modern, clean design with a soothing earthy color palette

## Meet Bud 🌿

Bud is your AI-powered personal gardener who helps tend to your financial garden. Just chat naturally:

- *"Add a $50 grocery expense to my checking account"*
- *"Transfer $200 from savings to my budget"*
- *"Create a new vacation fund account with $500"*
- *"Delete that coffee transaction from yesterday"*

Bud uses OpenAI GPT to understand your requests and performs actions directly on your accounts.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Lucia Auth
- **AI**: OpenAI GPT-4o-mini with function calling
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (or use a service like Neon, Supabase, Railway)
- OpenAI API key (for Bud AI features)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
OPENAI_API_KEY="sk-..."
```

3. Generate Prisma client and apply checked-in migrations:

```bash
npm run db:generate
npx prisma migrate deploy
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

### User
- `id`: Unique identifier
- `email`: User email (unique)
- `hashedPassword`: bcrypt hashed password
- `name`: Optional display name

### Account
- `id`: Unique identifier
- `name`: Account name
- `type`: SAVINGS | BUDGET | ALLOWANCE | RETIREMENT | STOCK
- `balance`: Current balance (Decimal)
- `userId`: Owner reference

### Transaction
- `id`: Unique identifier
- `amount`: Transaction amount (Decimal)
- `description`: Transaction description
- `date`: Transaction date
- `type`: INCOME | EXPENSE | TRANSFER
- `accountId`: Associated account
- `transferToAccountId`: Destination account (for transfers)
- `goalImpactEnvelopeId`: Optional goal used only for hypothetical opportunity-cost reporting

### Envelope
- Linked to one real `Account`
- `kind`: BUDGET | GOAL
- Optional target amount, monthly target, and target date
- Available balance is the sum of signed `EnvelopeEntry` ledger rows

### AllocationPlan
- One optional plan per real account
- Ordered FIXED, PERCENT, and REMAINDER rules
- Runs atomically when income is recorded

### Money invariants
- Account balances represent real cash.
- Envelope entries represent virtual assignments and must not create bank transfers.
- Goal-impact spending is hypothetical and never changes funded goal progress.
- Transaction, account, and envelope balance changes commit in one database transaction.

### DashboardShare
- `id`: Unique identifier
- `ownerId`: Dashboard owner
- `viewerId`: User with access
- `permission`: VIEW | EDIT
- `createdAt`: Share creation date

### Invitation
- `id`: Unique identifier
- `ownerId`: Inviter
- `recipientId`: Optional (if user exists)
- `email`: Invitee email
- `permission`: VIEW | EDIT
- `status`: PENDING | ACCEPTED | DECLINED | EXPIRED

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Check TypeScript without emitting files
- `npm test` - Run unit tests
- `npm run test:integration` - Run atomic ledger and shared-permission tests against `TEST_DATABASE_URL`
- `npm run test:e2e` - Run Playwright desktop and iPhone tests
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Auth pages (signin, signup)
│   ├── (dashboard)/      # Home, budgets, income, reports, activity, settings
│   ├── api/              # API routes
│   │   ├── auth/         # Auth endpoints
│   │   ├── accounts/     # Account CRUD
│   │   ├── transactions/ # Atomic transaction CRUD
│   │   ├── envelopes/    # Budget and goal envelopes
│   │   ├── allocation-plans/ # Income distribution plans
│   │   ├── reports/      # Read-only reporting aggregates
│   │   ├── transfers/    # Transfer operations
│   │   ├── invitations/  # Sharing invitations
│   │   ├── shares/       # Dashboard shares
│   │   └── chat/         # AI chat endpoint
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing page
├── components/
│   ├── dashboard/        # Dashboard components
│   │   ├── Bud.tsx       # AI assistant
│   │   ├── QuickActions.tsx
│   │   ├── ShareModal.tsx
│   │   └── ...
│   └── ui/               # Reusable UI components
├── lib/
│   ├── auth.ts           # Lucia auth configuration
│   ├── password.ts       # Password hashing utilities
│   ├── authorization.ts  # Owner and shared-dashboard permissions
│   ├── services/         # Ledger, allocation, and reporting logic
│   ├── prisma.ts         # Prisma client
│   └── utils.ts          # Utility functions
└── prisma/
    ├── schema.prisma     # Database schema
    └── migrations/       # Versioned production migrations
```

## Testing and migration safety

Run the local verification suite before release:

```bash
npm run typecheck
npm test
TEST_DATABASE_URL="postgresql://..." npm run test:integration
npm run lint
npm run build
npm run test:e2e
```

The authenticated Playwright journey requires a disposable migrated database and `E2E_FULL=1`. The default browser suite covers the public PWA shell, mobile viewport, accessibility scan, and protected-route behavior without changing financial data.

Existing `BUDGET` and `ALLOWANCE` accounts are preserved. Users can explicitly convert them in Settings by selecting a destination cash account; conversion moves the current cash balance and creates a matching envelope atomically.

## Author

Built by [Brennon](https://brennonstuart.com)

## License

MIT
