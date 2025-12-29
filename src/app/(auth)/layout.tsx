import { Sprout } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Background pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sage-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cream-300/40 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-sage-300/20 rounded-full blur-3xl" />
      </div>
      
      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <div className="p-2 bg-sage-100 rounded-xl group-hover:bg-sage-200 transition-colors">
          <Sprout className="h-6 w-6 text-sage-600" />
        </div>
        <span className="font-display text-xl font-semibold text-sage-800">
          Sprout
        </span>
      </Link>
      
      {children}
    </div>
  );
}

