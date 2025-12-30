import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invitation = await prisma.invitation.findFirst({
      where: {
        id: params.id,
        OR: [
          { recipientId: user.id },
          { email: user.email },
        ],
        status: "PENDING",
      },
      include: { sender: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
    }

    // Create the share and update invitation in a transaction
    await prisma.$transaction([
      prisma.dashboardShare.create({
        data: {
          ownerId: invitation.senderId,
          viewerId: user.id,
          permission: invitation.permission,
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { 
          status: "ACCEPTED",
          recipientId: user.id,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Accept invitation error:", error);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}

