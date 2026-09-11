import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import { createLedgerTransfer, deleteLedgerTransaction } from "@/lib/services/ledger";
import { ledgerDate, transferSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = transferSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { fromAccountId, toAccountId, amount, description, date } = result.data;
    const transfer = await createLedgerTransfer({
      actorId: user.id,
      fromAccountId,
      toAccountId,
      amount,
      description,
      date: date ? ledgerDate(date) : undefined,
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
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const transferId = new URL(request.url).searchParams.get("id");
    if (!transferId) {
      return NextResponse.json({ error: "Transfer ID required" }, { status: 400 });
    }

    const deleted = await deleteLedgerTransaction(user.id, transferId);
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
