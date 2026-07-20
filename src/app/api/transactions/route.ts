import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import {
  createLedgerTransaction,
  deleteLedgerTransaction,
  updateLedgerTransaction,
} from "@/lib/services/ledger";

const createTransactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["INCOME", "EXPENSE"]),
  accountId: z.string(),
  date: z.string().optional(),
  envelopeId: z.string().nullable().optional(),
  goalImpactEnvelopeId: z.string().nullable().optional(),
});

const updateTransactionSchema = createTransactionSchema
  .omit({ accountId: true, type: true })
  .extend({ id: z.string() });

export async function GET() {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        account: { userId: user.id },
      },
      orderBy: { date: "desc" },
      include: {
        account: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createTransactionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { amount, description, type, accountId, date, envelopeId, goalImpactEnvelopeId } =
      result.data;
    const transaction = await createLedgerTransaction({
      actorId: user.id,
      amount,
      description,
      type,
      accountId,
      date: date ? new Date(`${date}T12:00:00`) : undefined,
      envelopeId,
      goalImpactEnvelopeId,
    });

    return NextResponse.json(transaction);
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("id");

    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });
    }

    await deleteLedgerTransaction(user.id, transactionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const input = updateTransactionSchema.parse(await request.json());
    const transaction = await updateLedgerTransaction({
      actorId: user.id,
      transactionId: input.id,
      amount: input.amount,
      description: input.description,
      date: input.date ? new Date(`${input.date}T12:00:00`) : new Date(),
      envelopeId: input.envelopeId,
      goalImpactEnvelopeId: input.goalImpactEnvelopeId,
    });
    return NextResponse.json(transaction);
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
