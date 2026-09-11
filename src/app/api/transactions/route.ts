import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import {
  createLedgerTransaction,
  deleteLedgerTransaction,
  updateLedgerTransaction,
} from "@/lib/services/ledger";
import { listTransactions } from "@/lib/data/transactions";
import {
  createTransactionSchema,
  ledgerDate,
  updateTransactionSchema,
} from "@/lib/validation";
import type { TransactionKind } from "@/lib/data/types";

export async function GET(request: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = new URL(request.url).searchParams;
    const page = await listTransactions(
      user.id,
      {
        search: params.get("search") || undefined,
        type: (params.get("type") as TransactionKind | "ALL" | null) || undefined,
        accountId: params.get("accountId") || undefined,
        envelopeId: params.get("envelopeId") || undefined,
        from: params.get("from") || undefined,
        to: params.get("to") || undefined,
      },
      params.get("cursor"),
    );
    return NextResponse.json(page);
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = createTransactionSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { amount, description, notes, type, accountId, date, envelopeId, goalImpactEnvelopeId } =
      result.data;
    const transaction = await createLedgerTransaction({
      actorId: user.id,
      amount,
      description,
      notes,
      type,
      accountId,
      date: ledgerDate(date),
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
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const transactionId = new URL(request.url).searchParams.get("id");
    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });
    }

    const deleted = await deleteLedgerTransaction(user.id, transactionId);
    return NextResponse.json({ success: true, deleted });
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
      notes: input.notes,
      date: ledgerDate(input.date),
      envelopeId: input.envelopeId,
      goalImpactEnvelopeId: input.goalImpactEnvelopeId,
    });
    return NextResponse.json(transaction);
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
