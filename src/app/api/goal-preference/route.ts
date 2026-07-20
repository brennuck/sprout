import { NextResponse } from "next/server";
import { z } from "zod";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, AppError } from "@/lib/errors";
import { requireEnvelopeAccess } from "@/lib/authorization";

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
      .object({ goalEnvelopeId: z.string() })
      .parse(await request.json());
    const { envelope } = await requireEnvelopeAccess(user.id, goalEnvelopeId);
    if (envelope.kind !== "GOAL") {
      throw new AppError("Focus goal must be a goal envelope", 400, "INVALID_GOAL");
    }
    const preference = await prisma.goalPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, goalEnvelopeId },
      update: { goalEnvelopeId },
    });
    return NextResponse.json(preference);
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
