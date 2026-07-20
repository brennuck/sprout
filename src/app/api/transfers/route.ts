import { NextResponse } from "next/server";
import { z } from "zod";
import { validateRequest } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import {
  createLedgerTransfer,
  deleteLedgerTransaction,
} from "@/lib/services/ledger";

const transferSchema = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().optional().default("Transfer"),
});

export async function POST(request: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = transferSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { fromAccountId, toAccountId, amount, description } = result.data;

    const transfer = await createLedgerTransfer({
      actorId: user.id,
      fromAccountId,
      toAccountId,
      amount,
      description,
    });

    return NextResponse.json(transfer);
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
    const transferId = searchParams.get("id");

    if (!transferId) {
      return NextResponse.json({ error: "Transfer ID required" }, { status: 400 });
    }

    await deleteLedgerTransaction(user.id, transferId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

