"use client";

import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Shield,
  Smartphone,
  Sparkles,
  Target,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

const features: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: WalletCards,
    title: "Envelope budgets",
    body: "Car maintenance, groceries, fun money—create monthly budgets under the account that holds the cash.",
  },
  {
    icon: Target,
    title: "Goals that grow",
    body: "Save toward a phone, vacation, or emergency fund with targets, deadlines, and clear progress.",
  },
  {
    icon: BadgeDollarSign,
    title: "Income plans",
    body: "Record a paycheck once. Fixed, percent, and remainder rules fund envelopes automatically.",
  },
  {
    icon: BarChart3,
    title: "Reports & charts",
    body: "Cash flow, spending by envelope, net worth, and goal-impact views you can drill into.",
  },
  {
    icon: Activity,
    title: "Full activity ledger",
    body: "Search, filter, edit, and undo transactions. Reassign spending to the right envelope anytime.",
  },
  {
    icon: Users,
    title: "Household sharing",
    body: "Invite your partner with view or edit access so you can run one shared plan together.",
  },
  {
    icon: Smartphone,
    title: "iPhone-first",
    body: "Bottom navigation, safe areas, touch-friendly sheets, and an installable PWA shell.",
  },
  {
    icon: Sparkles,
    title: "Bud the gardener",
    body: "Chat with your personal gardener to log spending, check balances, and keep the plan tended.",
  },
  {
    icon: Shield,
    title: "Secure by default",
    body: "Session auth, owner and share permissions, and no offline money mutations.",
  },
];

function FeatureCard({
  icon: Icon,
  title,
  body,
  index,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  index: number;
}) {
  return (
    <article
      className="feature-card group flex w-[min(82vw,20rem)] shrink-0 flex-col rounded-3xl border border-line bg-surface/95 p-6 shadow-sm backdrop-blur sm:w-80"
      style={{ animationDelay: `${(index % features.length) * 120}ms` }}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-xl font-bold text-ink">{title}</h3>
      <p className="mt-3 text-ink-secondary">{body}</p>
    </article>
  );
}

function FeatureTrack({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="flex gap-4 pe-4" aria-hidden={ariaHidden || undefined}>
      {features.map((feature, index) => (
        <FeatureCard
          key={`${ariaHidden ? "dup" : "main"}-${feature.title}`}
          {...feature}
          index={index}
        />
      ))}
    </div>
  );
}

export function FeaturesCarousel() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background via-background/80 to-transparent sm:w-20" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background via-background/80 to-transparent sm:w-20" />

      <div
        role="region"
        aria-roledescription="marquee"
        aria-label="Sprout features"
        className="overflow-hidden py-2"
      >
        <div className="features-marquee flex w-max">
          <FeatureTrack />
          <FeatureTrack ariaHidden />
        </div>
      </div>

      <ul className="sr-only">
        {features.map((feature) => (
          <li key={feature.title}>
            {feature.title}: {feature.body}
          </li>
        ))}
      </ul>
    </div>
  );
}
