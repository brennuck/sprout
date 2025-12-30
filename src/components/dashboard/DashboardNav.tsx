"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sprout, LogOut, User as UserIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ShareModal } from "./ShareModal";
import type { User } from "lucia";

interface DashboardNavProps {
  user: User;
  pendingInvitations?: number;
}

export function DashboardNav({ user, pendingInvitations = 0 }: DashboardNavProps) {
  const router = useRouter();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <>
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
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsShareModalOpen(true)}
                >
                  <Users className="w-4 h-4" />
                  Share
                </Button>
                {pendingInvitations > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sage-500 text-[10px] font-bold text-white ring-2 ring-white">
                    {pendingInvitations > 9 ? "9+" : pendingInvitations}
                  </span>
                )}
              </div>
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

      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
      />
    </>
  );
}

