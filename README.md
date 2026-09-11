# Sprout

Envelope budgeting for real cash: monthly budgets, sinking funds, goals, paycheck plans, bills, and reports. Built with Next.js 14, Prisma, Lucia Auth, and Bud, an AI assistant.

## Features

- **Plan** — Month navigator, envelope rows, quick assign, reorder, archive/restore
- **Fast entry** — Global Add sheet for expense, income, and transfers, with payee memory and Undo
- **Income plans** — Fixed, percent, and remainder rules that run when a paycheck is recorded
- **Bills** — Weekly / biweekly / monthly / yearly schedules, mark paid, skip, optional auto-post
- **Reports** — SVG charts for spending, cash flow, net worth, and hypothetical goal impact
- **Bud** — Streaming chat with envelope-aware tools; destructive actions ask for confirmation
- **Sharing** — Invite a partner to view or edit the same dashboard
- **PWA** — Installable, PNG icons, service worker for `/_next/static`, dark mode without a flash

Tab bar on mobile: **Home · Plan · Add (+) · Activity · Reports**. Income lives on the Add sheet, a Payday card on Home, and the Plan header.

## Tech stack

- Next.js 14.2 (App Router) and React 18.3
- PostgreSQL with Prisma
- Lucia session auth
- OpenAI tools API (`OPENAI_MODEL`, default `gpt-4o-mini`)
- Tailwind CSS with semantic tokens
- Vitest, Playwright, axe-core

## Getting started

1. `npm install`
2. Create `.env`:

```env
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
CRON_SECRET="a-long-random-secret"
```

Neon: the Prisma URL helper appends `connect_timeout=15` when it is missing. Disabling scale-to-zero is the lasting fix for cold-start `P1001` errors.

3. Generate the client and apply checked-in migrations (additive only):

```bash
npm run db:generate
npx prisma migrate deploy
```

4. `npm run dev` and open [http://localhost:3000](http://localhost:3000).

Daily cron (`vercel.json`) hits `/api/cron/daily` for recurring envelope funding and auto-posted bills.

## Money invariants

- Account balances are real cash.
- Envelope entries are virtual assignments and never move bank money.
- Automatic sinking-fund contributions only use ready-to-assign cash; an underfunded occurrence stays due and retries.
- Goal-impact spending is hypothetical and never changes funded progress.
- Reconcile posts an `ADJUSTMENT` excluded from cash-flow reports.
- Ledger writes commit in one database transaction and call `invalidateOwner` so RSC snapshots refresh.

## Scripts

- `npm run dev` / `build` / `start`
- `npm run typecheck`
- `npm test` — unit tests (`budget-math`, bills, CSV, allocation, reports)
- `npm run test:integration` — ledger + reconcile/undo against `TEST_DATABASE_URL`
- `npm run test:e2e` — Playwright (set `E2E_FULL=1` for the authenticated journey)
- `npm run db:generate` / `db:migrate` / `db:studio`

## Project structure

```
src/
├── app/(dashboard)/     # Home, Plan, Activity, Reports, Income, Bills, Settings
├── app/api/chat/        # Bud streaming tools endpoint
├── app/api/cron/daily/  # Recurring funding + auto-post bills
├── components/add/      # Global Add sheet
├── components/plan/     # PlanView, envelope sheets, quick assign
├── components/shell/    # AppShell, snapshot provider, shortcuts
├── components/charts/   # SVG bar / line / donut
├── lib/actions/         # Server actions wrapping ledger services
├── lib/data/            # Cached snapshot, month plan, transactions
└── lib/services/        # Ledger, bills, payees, reports, CSV
```

Existing `BUDGET` and `ALLOWANCE` accounts can be converted in Settings onto a cash account; conversion moves the cash and creates a matching envelope atomically.

## Author

Built by [Brennon](https://brennonstuart.com)

## License

MIT
