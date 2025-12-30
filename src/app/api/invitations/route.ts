import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

const createInvitationSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  permission: z.enum(["VIEW", "EDIT"]).optional().default("VIEW"),
});

// GET - Get all invitations (sent and received)
export async function GET() {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [sentInvitations, receivedInvitations, sharedWithMe, sharedByMe] = await Promise.all([
      // Invitations I've sent
      prisma.invitation.findMany({
        where: { senderId: user.id },
        include: { recipient: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      }),
      // Invitations I've received
      prisma.invitation.findMany({
        where: {
          OR: [
            { recipientId: user.id },
            { email: user.email },
          ],
          status: "PENDING",
        },
        include: { sender: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      }),
      // Dashboards shared with me
      prisma.dashboardShare.findMany({
        where: { viewerId: user.id },
        include: { owner: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      }),
      // Dashboards I've shared
      prisma.dashboardShare.findMany({
        where: { ownerId: user.id },
        include: { viewer: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      sentInvitations,
      receivedInvitations,
      sharedWithMe,
      sharedByMe,
    });
  } catch (error) {
    console.error("Get invitations error:", error);
    return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
  }
}

// POST - Send a new invitation
export async function POST(request: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createInvitationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { email, permission } = result.data;

    // Can't invite yourself
    if (email.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
    }

    // Check if already shared with this email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      const existingShare = await prisma.dashboardShare.findUnique({
        where: {
          ownerId_viewerId: {
            ownerId: user.id,
            viewerId: existingUser.id,
          },
        },
      });

      if (existingShare) {
        return NextResponse.json({ error: "Already sharing with this user" }, { status: 400 });
      }
    }

    // Check for pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        senderId: user.id,
        email: email.toLowerCase(),
        status: "PENDING",
      },
    });

    if (existingInvitation) {
      return NextResponse.json({ error: "Invitation already sent to this email" }, { status: 400 });
    }

    // Create invitation (expires in 7 days)
    const invitation = await prisma.invitation.create({
      data: {
        email: email.toLowerCase(),
        permission,
        senderId: user.id,
        recipientId: existingUser?.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        recipient: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(invitation);
  } catch (error) {
    console.error("Create invitation error:", error);
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 });
  }
}

// DELETE - Cancel/revoke an invitation
export async function DELETE(request: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("id");

    if (!invitationId) {
      return NextResponse.json({ error: "Invitation ID is required" }, { status: 400 });
    }

    // Verify the invitation belongs to the user
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, senderId: user.id },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    await prisma.invitation.delete({
      where: { id: invitationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete invitation error:", error);
    return NextResponse.json({ error: "Failed to delete invitation" }, { status: 500 });
  }
}

