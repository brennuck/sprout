"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Home,
  LogOut,
  Settings,
  Sprout,
  Users,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ShareModal } from "@/components/dashboard/ShareModal";

interface AppShellNavProps {
  user: { name: string | null; email: string };
  pendingInvitations: number;
}

const navigation = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/budgets", label: "Budgets", icon: WalletCards },
  { href: "/income", label: "Income", icon: BadgeDollarSign },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/activity", label: "Activity", icon: Activity },
];

export function AppShellNav({ user, pendingInvitations }: AppShellNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const signOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-lg bg-ink px-4 py-3 text-white transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      <header className="glass pt-safe sticky top-0 z-40 border-b border-line lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" className="flex min-h-11 items-center gap-2 rounded-lg">
            <Sprout className="h-5 w-5 text-brand" aria-hidden="true" />
            <span className="font-display text-lg font-bold text-ink">Sprout</span>
          </Link>
          <Link
            href="/settings"
            aria-label="Open settings"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-ink-secondary hover:bg-brand-soft"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface/95 p-5 backdrop-blur lg:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft">
            <Sprout className="h-6 w-6 text-brand" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-display text-xl font-bold text-ink">Sprout</span>
            <span className="block text-xs text-ink-muted">Give every dollar a job</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="space-y-1">
          {navigation.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                  active
                    ? "bg-brand-soft text-brand-strong"
                    : "text-ink-secondary hover:bg-surface-muted hover:text-ink",
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 border-t border-line pt-4">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setShareOpen(true)}
          >
            <Users className="h-5 w-5" aria-hidden="true" />
            Share
            {pendingInvitations > 0 && (
              <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-xs text-white">
                {pendingInvitations}
              </span>
            )}
          </Button>
          <Link
            href="/settings"
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink-secondary hover:bg-surface-muted"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
            Settings
          </Link>
          <div className="flex items-center gap-3 rounded-xl bg-surface-muted p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
              {(user.name || user.email).slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{user.name || "Sprout user"}</p>
              <p className="truncate text-xs text-ink-muted">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-surface"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <nav
        aria-label="Primary"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
      >
        <div className="grid h-16 grid-cols-5">
          {navigation.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold",
                  active ? "text-brand-strong" : "text-ink-muted",
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  );
}
