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
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { 
        status: "DECLINED",
        recipientId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Decline invitation error:", error);
    return NextResponse.json({ error: "Failed to decline invitation" }, { status: 500 });
  }
}

