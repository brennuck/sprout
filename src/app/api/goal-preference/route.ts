import { NextResponse } from "next/server";
import { z } from "zod";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/errors";
import { setFocusGoal } from "@/lib/services/envelopes";

export async function GET() {
  const { user } = await validateRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const preference = await prisma.goalPreference.findUnique({
    where: { userId: user.id },
    include: { goalEnvelope: { select: { id: true, name: true } } },
  });
  return NextResponse.json(preference);
}

export async function PUT(request: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { goalEnvelopeId } = z
      .object({ goalEnvelopeId: z.string().nullable() })
      .parse(await request.json());
    const preference = await setFocusGoal(user.id, goalEnvelopeId);
    return NextResponse.json(preference);
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
