"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Bell,
  CalendarClock,
  Home,
  LogOut,
  Plus,
  Settings,
  Sprout,
  Users,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ShareModal } from "@/components/dashboard/ShareModal";
import { BudButton, BudLauncher } from "@/components/dashboard/Bud";
import { useAddSheet } from "@/components/add/AddSheet";
import { useSnapshot } from "@/components/shell/SnapshotProvider";
import { signOutAction } from "@/lib/actions/session";

interface AppShellProps {
  user: { name: string | null; email: string };
  children: ReactNode;
}

const primaryNav = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/budgets", label: "Plan", icon: WalletCards },
  { href: "/income", label: "Income", icon: BadgeDollarSign },
  { href: "/bills", label: "Bills", icon: CalendarClock },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

type NavItem = { href: string; label: string; icon: typeof Home; exact?: boolean };

const tabBar: (NavItem | null)[] = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/budgets", label: "Plan", icon: WalletCards },
  null,
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const snapshot = useSnapshot();
  const { openAdd } = useAddSheet();
  const [shareOpen, setShareOpen] = useState(false);
  const pending = snapshot.pendingInvitations;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen lg:pl-64">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-lg bg-ink px-4 py-3 text-ink-inverse transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      {/* Mobile header */}
      <header className="glass pt-safe sticky top-0 z-40 border-b border-line lg:hidden">
        <div className="flex h-14 items-center justify-between px-3">
          <Link href="/dashboard" className="flex min-h-11 items-center gap-2 rounded-lg px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
            <Sprout className="h-5 w-5 text-brand" aria-hidden="true" />
            <span className="font-display text-lg font-bold text-ink">Sprout</span>
          </Link>
          <div className="flex items-center gap-1">
            <BudButton className="h-10 w-10" />
            <Link
              href="/settings#sharing"
              aria-label={pending > 0 ? `${pending} pending invitation${pending === 1 ? "" : "s"}` : "Sharing"}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl text-ink-secondary hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {pending > 0 && (
                <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-contrast">
                  {pending}
                </span>
              )}
            </Link>
            <Link
              href="/settings"
              aria-label="Settings"
              aria-current={isActive("/settings") ? "page" : undefined}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl text-ink-secondary hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                isActive("/settings") && "bg-brand-soft text-brand-strong",
              )}
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface/95 p-5 backdrop-blur lg:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-3 rounded-xl px-2 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft">
            <Sprout className="h-6 w-6 text-brand" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-display text-xl font-bold text-ink">Sprout</span>
            <span className="block text-xs text-ink-muted">Give every dollar a job</span>
          </span>
        </Link>

        <Button onClick={() => openAdd("expense")} className="mb-5 w-full" size="lg">
          <Plus className="h-5 w-5" aria-hidden="true" /> Add
          <kbd className="ml-auto rounded-md bg-brand-contrast/15 px-1.5 text-xs font-semibold">N</kbd>
        </Button>

        <nav aria-label="Primary" className="space-y-1">
          {primaryNav.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors duration-instant focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  active ? "bg-brand-soft text-brand-strong" : "text-ink-secondary hover:bg-surface-muted hover:text-ink",
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink-secondary hover:bg-surface-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Users className="h-5 w-5" aria-hidden="true" />
            Share
            {pending > 0 && (
              <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-brand-contrast">{pending}</span>
            )}
          </button>
          <Link
            href="/settings"
            aria-current={isActive("/settings") ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              isActive("/settings") ? "bg-brand-soft text-brand-strong" : "text-ink-secondary hover:bg-surface-muted hover:text-ink",
            )}
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
            Settings
          </Link>
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-surface-muted p-3">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-contrast">
              {(user.name || user.email).slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{user.name || "Sprout user"}</p>
              <p className="truncate text-xs text-ink-muted">{user.email}</p>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                aria-label="Sign out"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main id="main-content" className="mx-auto max-w-7xl px-4 pb-tabbar pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-12 lg:pt-8">
        {children}
      </main>

      {/* Mobile tab bar */}
      <nav aria-label="Primary" className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line lg:hidden">
        <div className="grid h-16 grid-cols-5 items-stretch pb-safe">
          {tabBar.map((item) =>
            item === null ? (
              <div key="add" className="relative flex items-start justify-center">
                <button
                  type="button"
                  onClick={() => openAdd("expense")}
                  aria-label="Add expense, income, or transfer"
                  className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-contrast shadow-float ring-4 ring-background transition-transform duration-instant active:scale-95 focus:outline-none focus-visible:ring-focus"
                >
                  <Plus className="h-7 w-7" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href, item.exact) ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[11px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus",
                  isActive(item.href, item.exact) ? "text-brand-strong" : "text-ink-muted",
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            ),
          )}
        </div>
      </nav>

      <BudLauncher />
      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
