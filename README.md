# 🌱 Sprout

A beautiful budgeting app that helps you grow your finances. Built with Next.js 14, Prisma, and Lucia Auth.

## Features

- 🔐 **Secure Authentication** - Sign up and sign in with Lucia
- 💰 **Multiple Accounts** - Track savings, budgets, allowances, retirement, and stock accounts
- 📊 **Transaction Tracking** - Record income and expenses with automatic balance updates
- 🔄 **Savings Integration** - Option to automatically deduct from savings for non-savings expenses
- 📥 **Data Export/Import** - Download and upload your budget data as JSON
- 🎨 **Beautiful UI** - Modern, clean design with a soothing earthy color palette

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Lucia Auth
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (or use a service like Neon, Supabase, Railway)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env` file in the root directory with your database URL:

```env
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

3. Generate Prisma client and push the schema to your database:

```bash
npm run db:generate
npm run db:push
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
- `hashedPassword`: Bcrypt hashed password
- `name`: Optional display name

### Account
- `id`: Unique identifier
- `name`: Account name
- `type`: SAVINGS | BUDGET | ALLOWANCE | RETIREMENT | STOCK
- `balance`: Current balance
- `userId`: Owner reference

### Transaction
- `id`: Unique identifier
- `amount`: Transaction amount
- `description`: Optional description
- `date`: Transaction date
- `type`: INCOME | EXPENSE
- `takeFromSavings`: Whether to deduct from savings account
- `fromAccountId`: Source account (for expenses)
- `toAccountId`: Destination account (for income)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Auth pages (signin, signup)
│   ├── (dashboard)/      # Protected dashboard pages
│   ├── api/              # API routes
│   │   ├── auth/         # Auth endpoints
│   │   ├── accounts/     # Account CRUD
│   │   ├── transactions/ # Transaction CRUD
│   │   └── data/         # Import/export
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing page
├── components/
│   ├── dashboard/        # Dashboard-specific components
│   └── ui/               # Reusable UI components
├── lib/
│   ├── auth.ts           # Lucia auth configuration
│   ├── password.ts       # Password hashing utilities
│   ├── prisma.ts         # Prisma client
│   └── utils.ts          # Utility functions
└── prisma/
    └── schema.prisma     # Database schema
```

## License

MIT
