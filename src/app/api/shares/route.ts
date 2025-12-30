import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

// DELETE - Revoke a share (either as owner or as viewer leaving)
export async function DELETE(request: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get("id");

    if (!shareId) {
      return NextResponse.json({ error: "Share ID is required" }, { status: 400 });
    }

    // Verify the share belongs to the user (either as owner or viewer)
    const share = await prisma.dashboardShare.findFirst({
      where: {
        id: shareId,
        OR: [
          { ownerId: user.id },
          { viewerId: user.id },
        ],
      },
    });

    if (!share) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    await prisma.dashboardShare.delete({
      where: { id: shareId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete share error:", error);
    return NextResponse.json({ error: "Failed to delete share" }, { status: 500 });
  }
}

