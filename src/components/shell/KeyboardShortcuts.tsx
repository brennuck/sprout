"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { useAddSheet } from "@/components/add/AddSheet";
import { useBud } from "@/components/dashboard/Bud";

const isTyping = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || element.isContentEditable;
};

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: "N", description: "Add an expense" },
  { keys: "I", description: "Record income" },
  { keys: "T", description: "Transfer between accounts" },
  { keys: "B", description: "Talk to Bud" },
  { keys: "/", description: "Search activity" },
  { keys: "G then H / P / A / R", description: "Go to Home, Plan, Activity, Reports" },
  { keys: "?", description: "Show this help" },
];

/** Desktop keyboard shortcuts. Ignored while typing in a field or inside a dialog. */
export function KeyboardShortcuts() {
  const { openAdd } = useAddSheet();
  const { openBud } = useBud();
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    let pendingGo = false;
    let goTimer = 0;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;
      if (document.querySelector('[role="dialog"]')) return;

      if (pendingGo) {
        pendingGo = false;
        window.clearTimeout(goTimer);
        const routes: Record<string, string> = { h: "/dashboard", p: "/budgets", a: "/activity", r: "/reports", i: "/income", s: "/settings" };
        const route = routes[event.key.toLowerCase()];
        if (route) {
          event.preventDefault();
          router.push(route);
        }
        return;
      }

      switch (event.key) {
        case "n":
          event.preventDefault();
          openAdd("expense");
          break;
        case "i":
          event.preventDefault();
          openAdd("income");
          break;
        case "t":
          event.preventDefault();
          openAdd("transfer");
          break;
        case "b":
          event.preventDefault();
          openBud();
          break;
        case "/": {
          const search = document.querySelector<HTMLInputElement>("[data-search-input]");
          if (search) {
            event.preventDefault();
            search.focus();
          } else {
            event.preventDefault();
            router.push("/activity?focus=search");
          }
          break;
        }
        case "?":
          event.preventDefault();
          setHelpOpen(true);
          break;
        case "g":
          pendingGo = true;
          goTimer = window.setTimeout(() => {
            pendingGo = false;
          }, 1200);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(goTimer);
    };
  }, [openAdd, openBud, router]);

  return (
    <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title="Keyboard shortcuts" size="sm">
      <dl className="divide-y divide-line text-sm">
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.keys} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-ink-secondary">{shortcut.description}</dt>
            <dd>
              <kbd className="rounded-md border border-line bg-surface-muted px-2 py-0.5 font-mono text-xs text-ink">{shortcut.keys}</kbd>
            </dd>
          </div>
        ))}
      </dl>
    </Sheet>
  );
}
