import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  MessageSquare,
  Shield,
  Smartphone,
  Sparkles,
  Sprout,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FeaturesCarousel } from "@/components/FeaturesCarousel";
import { validateRequest } from "@/lib/auth";

export default async function HomePage() {
  const { user } = await validateRequest();

  return (
    <div className="min-h-screen">
      <nav className="pt-safe glass sticky top-0 z-50 border-b border-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-h-11 items-center gap-2 rounded-lg">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft">
              <Sprout className="h-5 w-5 text-brand" aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-bold text-ink">Sprout</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button>
                  Open app
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/signin">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link href="/signup">
                  <Button>
                    Get started
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,hsl(var(--brand-soft)),transparent_42%),radial-gradient(circle_at_85%_20%,hsl(94_28%_88%_/_0.9),transparent_36%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border-subtle)_/_0.45)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border-subtle)_/_0.45)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
          </div>

          <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
            <div className="mx-auto max-w-3xl text-center">
              <p className="font-display text-5xl font-bold tracking-tight text-brand-strong sm:text-6xl lg:text-7xl">
                Sprout
              </p>
              <h1 className="mt-5 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl lg:text-5xl">
                Give every dollar a job
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg text-ink-secondary">
                Envelope budgets, paycheck plans, goal tracking, reports, household sharing,                 and Bud—your personal gardener for money.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href={user ? "/dashboard" : "/signup"}>
                  <Button size="lg" className="min-w-[12rem] text-base">
                    {user ? "Continue budgeting" : "Start budgeting"}
                    <Sprout className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button variant="outline" size="lg" className="min-w-[12rem] text-base">
                    Explore features
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="relative mt-4 border-y border-line bg-brand-strong text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(94_24%_42%_/_0.55),transparent_55%)]" />
            <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sage-200">This month</p>
                  <p className="mt-3 font-display text-4xl font-bold sm:text-5xl">$420 ready to assign</p>
                  <p className="mt-3 max-w-md text-sage-100">
                    Paycheck landed. Groceries, car care, and New Phone already funded from your plan.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Groceries", value: "$380", detail: "Budget left" },
                      { label: "Car care", value: "$120", detail: "Budget left" },
                      { label: "New phone", value: "62%", detail: "Goal funded" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl bg-white/10 px-4 py-4 backdrop-blur">
                        <p className="text-sm text-sage-100">{item.label}</p>
                        <p className="mt-2 text-2xl font-bold">{item.value}</p>
                        <p className="mt-1 text-xs text-sage-200">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-4 backdrop-blur">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold">New phone progress</span>
                      <span className="text-sage-100">$620 / $1,000</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full w-[62%] rounded-full bg-cream-200" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="overflow-hidden py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">Everything in Sprout</h2>
              <p className="mt-4 text-lg text-ink-secondary">
                Real cash in accounts. Virtual envelopes for every job. Reports and Bud to keep the plan alive.
              </p>
            </div>
            <div className="mt-10">
              <FeaturesCarousel />
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-surface py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">How the money flows</h2>
              <p className="mt-4 text-lg text-ink-secondary">
                Sprout keeps bank balances honest while envelopes do the planning work.
              </p>
            </div>
            <ol className="mt-12 grid gap-8 lg:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Park cash in accounts",
                  body: "Checking, savings, and investments stay as real balances—the source of truth.",
                },
                {
                  step: "02",
                  title: "Assign with envelopes",
                  body: "Give dollars jobs: monthly budgets for spending and goals for the things you’re building toward.",
                },
                {
                  step: "03",
                  title: "Fund on payday",
                  body: "Your income plan runs when you record a paycheck. Leftovers stay Ready to assign.",
                },
              ].map((item) => (
                <li key={item.step}>
                  <p className="font-display text-4xl font-bold text-brand/30">{item.step}</p>
                  <h3 className="mt-3 text-xl font-bold text-ink">{item.title}</h3>
                  <p className="mt-3 text-ink-secondary">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Goal motivation</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">
                See what spending costs your focus goal
              </h2>
              <p className="mt-4 text-lg text-ink-secondary">
                Log dinner out and Sprout can show the hypothetical hit against New Phone or Vacation—percent of target,
                estimated delay, and what progress would look like without that spend. Funded savings never change
                unless you move money on purpose.
              </p>
            </div>

            <div className="rounded-[2rem] bg-brand-soft/70 p-6 sm:p-8">
              <p className="text-sm font-semibold text-brand-strong">Focus goal · New phone</p>
              <p className="mt-4 font-display text-4xl font-bold text-ink">$60 dinner</p>
              <p className="mt-3 text-ink-secondary">
                Hypothetically 6% of the goal and about 9 days at your current pace. Saved progress stays at $620.
              </p>
              <div className="mt-8 space-y-4">
                <div>
                  <div className="mb-2 flex justify-between text-sm font-semibold text-ink">
                    <span>Actually funded</span>
                    <span>62%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-surface">
                    <div className="h-full w-[62%] rounded-full bg-brand" />
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <p className="text-sm font-semibold text-ink">Hypothetical impact</p>
                  <p className="mt-1 text-2xl font-bold text-warning">$60</p>
                  <p className="mt-1 text-sm text-ink-secondary">Shown to help you choose—never deducted from the goal.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-20 sm:py-24">
          <div className="absolute inset-0 bg-gradient-to-br from-sage-900 via-sage-800 to-sage-950" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff1_1px,transparent_1px),linear-gradient(to_bottom,#fff1_1px,transparent_1px)] bg-[size:3rem_3rem]" />
          <div className="absolute left-1/4 top-16 h-64 w-64 rounded-full bg-sage-400/20 blur-3xl" />
          <div className="absolute bottom-10 right-1/4 h-80 w-80 rounded-full bg-cream-400/10 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cream-200">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                AI-powered gardener
              </p>
              <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
                Meet Bud, your personal gardener
              </h2>
              <p className="mt-4 text-lg text-sage-200">
                Tell Bud what happened in plain English. Your friendly gardener logs transactions, helps manage
                accounts, and answers questions about your plan.
              </p>
            </div>

            <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-brand px-4 py-3 text-sm text-white">
                    I spent $47.50 at Whole Foods for groceries
                  </div>
                </div>
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/bud.svg"
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 flex-none rounded-full bg-cream-100"
                  />
                  <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white/20 px-4 py-3 text-sm text-white">
                    Done! Planted $47.50 in Groceries. You still have $332.50 available there this month.
                  </div>
                </div>
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm text-sage-200">
                <Zap className="h-4 w-4 text-cream-300" aria-hidden="true" />
                Transaction added · Envelope updated · Dashboard refreshed
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: MessageSquare,
                  title: "Add transactions",
                  body: "“I spent $50 at Target” — Bud records expenses and income from natural chat.",
                },
                {
                  icon: Brain,
                  title: "Manage the garden",
                  body: "Create accounts, move cash, and keep envelopes tidy without hunting through menus.",
                },
                {
                  icon: BarChart3,
                  title: "Ask for insights",
                  body: "“How much did I spend this week?” — quick answers grounded in your real ledger.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-cream-200">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-sage-300">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">Built for real households</h2>
                <p className="mt-4 text-lg text-ink-secondary">
                  Use Sprout on your iPhone, invite a partner, and keep one shared plan without losing clarity.
                </p>
                <div className="mt-8 space-y-5">
                  <div className="flex gap-3">
                    <Users className="mt-0.5 h-5 w-5 flex-none text-brand" aria-hidden="true" />
                    <p className="text-ink-secondary">
                      Share a dashboard so both of you can see Ready to assign, budgets, goals, and reports.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Smartphone className="mt-0.5 h-5 w-5 flex-none text-brand" aria-hidden="true" />
                    <p className="text-ink-secondary">
                      Installable shell with safe-area navigation, large touch targets, and keyboard-friendly forms.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Shield className="mt-0.5 h-5 w-5 flex-none text-brand" aria-hidden="true" />
                    <p className="text-ink-secondary">
                      Authenticated sessions and permission checks on every money mutation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-line bg-surface p-6 sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Also included</p>
                <ul className="mt-6 space-y-4 text-ink-secondary">
                  <li>Home dashboard with cash, Ready to assign, overspent alerts, and recent activity</li>
                  <li>Income page with live paycheck previews and undo</li>
                  <li>Settings for accounts, sharing, profile, and legacy budget conversion</li>
                  <li>Optional focus goal preference for spend opportunity cost</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-safe border-t border-line bg-brand-soft/50 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <Sprout className="mx-auto h-10 w-10 text-brand" aria-hidden="true" />
            <h2 className="mt-5 font-display text-3xl font-bold text-ink sm:text-4xl">
              Start giving your money a purpose
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-ink-secondary">
              Set up envelopes, wire your paycheck plan, track goals, read the reports, and let Bud help along the way.
            </p>
            <div className="mt-8">
              <Link href={user ? "/dashboard" : "/signup"}>
                <Button size="lg" className="text-base">
                  {user ? "Open Sprout" : "Create your free account"}
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="pb-safe border-t border-line py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-brand" aria-hidden="true" />
            <span className="text-sm font-semibold text-ink">Sprout</span>
          </div>
          <p className="text-sm text-ink-muted">
            Built by{" "}
            <a
              href="https://bnuckols.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink-secondary underline underline-offset-2 hover:text-ink"
            >
              Brennon
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
