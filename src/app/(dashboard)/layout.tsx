import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShellNav } from "@/components/dashboard/AppShellNav";
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
    <div className="min-h-screen lg:pl-64">
      <AppShellNav user={user} pendingInvitations={pendingInvitationCount} />
      <main
        id="main-content"
        className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10"
      >
        {children}
      </main>
      <Bud />
    </div>
  );
}

