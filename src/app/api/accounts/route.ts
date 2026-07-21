import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import {
    convertLegacyAccount,
    createLedgerAccount,
    deleteLedgerAccount,
} from "@/lib/services/ledger";

const createAccountSchema = z.object({
    name: z.string().min(1, "Account name is required"),
    type: z.enum(["SAVINGS", "BUDGET", "ALLOWANCE", "RETIREMENT", "STOCK"]),
    startingBalance: z.number().optional().default(0),
    fundFromAccountId: z.string().optional(),
    fundAmount: z.number().optional(),
});

const convertAccountSchema = z.object({
    action: z.literal("CONVERT_LEGACY"),
    sourceAccountId: z.string(),
    destinationAccountId: z.string(),
    envelopeName: z.string().trim().min(1).max(80),
    kind: z.enum(["BUDGET", "SINKING_FUND", "GOAL"]),
});

export async function GET() {
    try {
        const { user } = await validateRequest();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const accounts = await prisma.account.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json(accounts);
    } catch (error) {
        console.error("Get accounts error:", error);
        return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { user } = await validateRequest();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const result = createAccountSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
        }

        const { name, type, startingBalance, fundFromAccountId, fundAmount } = result.data;

        const account = await createLedgerAccount({
            actorId: user.id,
            name,
            type,
            startingBalance,
            fundFromAccountId,
            fundAmount,
        });

        return NextResponse.json(account);
    } catch (error) {
        const response = errorResponse(error);
        return NextResponse.json(response.body, { status: response.status });
    }
}

export async function PATCH(request: Request) {
    try {
        const { user } = await validateRequest();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const input = convertAccountSchema.parse(await request.json());
        const envelope = await convertLegacyAccount(
            user.id,
            input.sourceAccountId,
            input.destinationAccountId,
            input.envelopeName,
            input.kind,
        );
        return NextResponse.json(envelope);
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
        const accountId = searchParams.get("id");

        if (!accountId) {
            return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
        }

        await deleteLedgerAccount(user.id, accountId);

        return NextResponse.json({ success: true });
    } catch (error) {
        const response = errorResponse(error);
        return NextResponse.json(response.body, { status: response.status });
    }
}
