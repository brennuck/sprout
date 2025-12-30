import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Bud } from "@/components/dashboard/Bud";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await validateRequest();

  if (!user) {
    redirect("/signin");
  }

  // Get pending invitation count
  const pendingInvitationCount = await prisma.invitation.count({
    where: {
      OR: [
        { recipientId: user.id },
        { email: user.email },
      ],
      status: "PENDING",
    },
  });

  return (
    <div className="min-h-screen">
      <DashboardNav user={user} pendingInvitations={pendingInvitationCount} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Bud />
    </div>
  );
}

