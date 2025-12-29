"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sprout, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { User } from "lucia";

interface DashboardNavProps {
  user: User;
}

export function DashboardNav({ user }: DashboardNavProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="glass border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="p-1.5 bg-sage-100 rounded-lg group-hover:bg-sage-200 transition-colors">
              <Sprout className="h-5 w-5 text-sage-600" />
            </div>
            <span className="font-display text-lg font-semibold text-sage-800">
              Sprout
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sage-600">
              <UserIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                {user.name || user.email}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

