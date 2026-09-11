import { Sprout } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Link href="/" className="group mb-8 flex items-center gap-2">
        <div className="p-2 bg-brand-soft rounded-xl group-hover:bg-brand-soft/70 transition-colors">
          <Sprout className="h-6 w-6 text-brand" />
        </div>
        <span className="font-display text-xl font-semibold text-ink">
          Sprout
        </span>
      </Link>
      
      {children}
    </div>
  );
}

