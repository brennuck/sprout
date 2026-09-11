import { z } from "zod";
import OpenAI from "openai";
import { validateRequest } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getBudgetSnapshot, upcomingBills } from "@/lib/data/snapshot";
import {
  createLedgerAccount,
  createLedgerTransaction,
  createLedgerTransfer,
  deleteLedgerAccount,
  deleteLedgerTransaction,
  fundEnvelope,
  moveEnvelopeMoney,
  unassignEnvelopeMoney,
} from "@/lib/services/ledger";
import { archiveEnvelope, createEnvelope, setFocusGoal } from "@/lib/services/envelopes";
import { markBillPaid } from "@/lib/services/bills";
import { ledgerDate } from "@/lib/validation";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const chatSchema = z.object({
  message: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .optional()
    .default([]),
  confirm: z
    .object({
      id: z.string(),
      name: z.string(),
      args: z.record(z.unknown()),
    })
    .optional(),
});

const BUD_SYSTEM_PROMPT = `You are Bud, a friendly personal gardener who helps users manage envelope budgets in Sprout.

Personality:
- Warm, encouraging, and concise (1–2 short paragraphs)
- Use light gardening metaphors when they help, never when they confuse
- Speak casually but clearly

You can:
- Add expenses and income (use envelope IDs from context)
- Transfer between accounts
- Fund, move, or unassign envelope money
- Create envelopes and set a focus goal
- Mark a bill paid
- Read the current snapshot

Rules:
- Use the IDs provided in context, never invent IDs
- Amounts are always positive; the ledger handles signs
- If a required field is missing, ask one short question
- Do not claim you deleted, archived, or closed something until the user confirms the card
- Saved goal progress never changes when spending is tagged as hypothetical impact`;

const DESTRUCTIVE = new Set(["delete_transaction", "delete_account", "archive_envelope"]);

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "add_expense",
      description: "Record an expense against a cash account and optional envelope",
      parameters: {
        type: "object",
        properties: {
          accountId: { type: "string" },
          amount: { type: "number" },
          description: { type: "string" },
          envelopeId: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
          goalImpactEnvelopeId: { type: "string" },
        },
        required: ["accountId", "amount", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_income",
      description: "Record income; the paycheck plan runs automatically",
      parameters: {
        type: "object",
        properties: {
          accountId: { type: "string" },
          amount: { type: "number" },
          description: { type: "string" },
          date: { type: "string" },
        },
        required: ["accountId", "amount", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "transfer",
      description: "Move cash between two accounts",
      parameters: {
        type: "object",
        properties: {
          fromAccountId: { type: "string" },
          toAccountId: { type: "string" },
          amount: { type: "number" },
          description: { type: "string" },
        },
        required: ["fromAccountId", "toAccountId", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fund_envelope",
      description: "Assign ready-to-assign cash into an envelope",
      parameters: {
        type: "object",
        properties: {
          envelopeId: { type: "string" },
          amount: { type: "number" },
        },
        required: ["envelopeId", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "move_money",
      description: "Move assigned money from one envelope to another in the same account",
      parameters: {
        type: "object",
        properties: {
          fromEnvelopeId: { type: "string" },
          toEnvelopeId: { type: "string" },
          amount: { type: "number" },
        },
        required: ["fromEnvelopeId", "toEnvelopeId", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "unassign",
      description: "Return money from an envelope to ready-to-assign",
      parameters: {
        type: "object",
        properties: {
          envelopeId: { type: "string" },
          amount: { type: "number" },
        },
        required: ["envelopeId", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_envelope",
      description: "Create a budget, sinking fund, or goal",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          kind: { type: "string", enum: ["BUDGET", "SINKING_FUND", "GOAL"] },
          accountId: { type: "string" },
          monthlyTarget: { type: "number" },
          targetAmount: { type: "number" },
        },
        required: ["name", "kind", "accountId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_focus_goal",
      description: "Set or clear the user's focus goal",
      parameters: {
        type: "object",
        properties: {
          goalEnvelopeId: { type: "string", description: "Null or omit to clear" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_bill_paid",
      description: "Post a due scheduled bill as paid",
      parameters: {
        type: "object",
        properties: {
          billId: { type: "string" },
          amount: { type: "number" },
        },
        required: ["billId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_snapshot",
      description: "Read current ready-to-assign, envelopes, goals, and upcoming bills",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_transaction",
      description: "Delete a transaction. Requires user confirmation.",
      parameters: {
        type: "object",
        properties: { transactionId: { type: "string" } },
        required: ["transactionId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_account",
      description: "Delete an account. Requires user confirmation.",
      parameters: {
        type: "object",
        properties: { accountId: { type: "string" } },
        required: ["accountId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "archive_envelope",
      description: "Archive an envelope. Requires user confirmation.",
      parameters: {
        type: "object",
        properties: { envelopeId: { type: "string" } },
        required: ["envelopeId"],
      },
    },
  },
];

type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "action"; message: string; success: boolean }
  | { type: "confirm"; id: string; name: string; args: Record<string, unknown>; summary: string }
  | { type: "done"; actionPerformed: boolean }
  | { type: "error"; message: string };

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function str(value: unknown) {
  return typeof value === "string" ? value : "";
}

async function compactSnapshot(userId: string) {
  const snapshot = await getBudgetSnapshot(userId);
  const bills = upcomingBills(snapshot, 21);
  return {
    readyToAssign: snapshot.totals.readyToAssign,
    cash: snapshot.totals.cash,
    accounts: snapshot.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      balance: account.balance,
      readyToAssign: account.readyToAssign,
    })),
    envelopes: snapshot.envelopes.map((envelope) => ({
      id: envelope.id,
      name: envelope.name,
      kind: envelope.kind,
      accountId: envelope.accountId,
      balance: envelope.balance,
      monthlyTarget: envelope.monthlyTarget,
      targetAmount: envelope.targetAmount,
    })),
    focusGoalId: snapshot.focusGoalId,
    bills: bills.map((bill) => ({
      id: bill.id,
      description: bill.description,
      amount: bill.amount,
      nextDueAt: bill.nextDueAt,
      type: bill.type,
    })),
  };
}

function confirmSummary(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "delete_transaction":
      return `Delete this transaction? This can be undone from Activity.`;
    case "delete_account":
      return `Delete this account and its history?`;
    case "archive_envelope":
      return `Archive this envelope? Assigned money stays until you return it.`;
    default:
      return `Confirm ${name} ${JSON.stringify(args)}`;
  }
}

async function executeTool(
  userId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<{ success: boolean; message: string; data?: unknown }> {
  try {
    switch (name) {
      case "add_expense": {
        const amount = num(args.amount);
        await createLedgerTransaction({
          actorId: userId,
          accountId: str(args.accountId),
          amount,
          description: str(args.description),
          type: "EXPENSE",
          date: args.date ? ledgerDate(str(args.date)) : undefined,
          envelopeId: args.envelopeId ? str(args.envelopeId) : null,
          goalImpactEnvelopeId: args.goalImpactEnvelopeId ? str(args.goalImpactEnvelopeId) : null,
        });
        return { success: true, message: `Logged ${formatCurrency(amount)} for ${str(args.description)}` };
      }
      case "add_income": {
        const amount = num(args.amount);
        await createLedgerTransaction({
          actorId: userId,
          accountId: str(args.accountId),
          amount,
          description: str(args.description) || "Paycheck",
          type: "INCOME",
          date: args.date ? ledgerDate(str(args.date)) : undefined,
        });
        return { success: true, message: `Recorded ${formatCurrency(amount)} of income` };
      }
      case "transfer": {
        const amount = num(args.amount);
        await createLedgerTransfer({
          actorId: userId,
          fromAccountId: str(args.fromAccountId),
          toAccountId: str(args.toAccountId),
          amount,
          description: str(args.description) || undefined,
        });
        return { success: true, message: `Moved ${formatCurrency(amount)} between accounts` };
      }
      case "fund_envelope": {
        const amount = num(args.amount);
        await fundEnvelope(userId, str(args.envelopeId), amount);
        return { success: true, message: `Assigned ${formatCurrency(amount)}` };
      }
      case "move_money": {
        const amount = num(args.amount);
        await moveEnvelopeMoney(userId, str(args.fromEnvelopeId), str(args.toEnvelopeId), amount);
        return { success: true, message: `Moved ${formatCurrency(amount)} between envelopes` };
      }
      case "unassign": {
        const amount = num(args.amount);
        await unassignEnvelopeMoney(userId, str(args.envelopeId), amount);
        return { success: true, message: `Returned ${formatCurrency(amount)} to ready to assign` };
      }
      case "create_envelope": {
        const envelope = await createEnvelope({
          actorId: userId,
          name: str(args.name),
          kind: str(args.kind) as "BUDGET" | "SINKING_FUND" | "GOAL",
          accountId: str(args.accountId),
          monthlyTarget: args.monthlyTarget ? num(args.monthlyTarget) : null,
          targetAmount: args.targetAmount ? num(args.targetAmount) : null,
        });
        return { success: true, message: `Created ${envelope.name}`, data: { id: envelope.id } };
      }
      case "set_focus_goal": {
        const id = args.goalEnvelopeId ? str(args.goalEnvelopeId) : null;
        await setFocusGoal(userId, id);
        return { success: true, message: id ? "Focus goal updated" : "Focus goal cleared" };
      }
      case "mark_bill_paid": {
        await markBillPaid(userId, str(args.billId), args.amount === undefined ? undefined : num(args.amount));
        return { success: true, message: "Bill marked paid" };
      }
      case "get_snapshot": {
        const snapshot = await compactSnapshot(userId);
        return { success: true, message: "Snapshot loaded", data: snapshot };
      }
      case "delete_transaction": {
        await deleteLedgerTransaction(userId, str(args.transactionId));
        return { success: true, message: "Transaction deleted" };
      }
      case "delete_account": {
        await deleteLedgerAccount(userId, str(args.accountId));
        return { success: true, message: "Account deleted" };
      }
      case "archive_envelope": {
        await archiveEnvelope(userId, str(args.envelopeId), true);
        return { success: true, message: "Envelope archived" };
      }
      case "create_account": {
        const account = await createLedgerAccount({
          actorId: userId,
          name: str(args.name),
          type: (str(args.type) as "SAVINGS") || "SAVINGS",
          startingBalance: num(args.startingBalance),
        });
        return { success: true, message: `Created ${account.name}` };
      }
      default:
        return { success: false, message: "I do not know that action" };
    }
  } catch (error) {
    const message = error instanceof AppError ? error.message : "I could not complete that";
    return { success: false, message };
  }
}

function ndjsonResponse(run: (send: (event: StreamEvent) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        await run(send);
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Bud could not answer right now",
        });
        send({ type: "done", actionPerformed: false });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const { user } = await validateRequest();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const parsed = chatSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.errors[0]?.message ?? "Invalid request" }), {
      status: 400,
    });
  }

  const { message, history, confirm } = parsed.data;
  if (!message?.trim() && !confirm) {
    return new Response(JSON.stringify({ error: "Message is required" }), { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return ndjsonResponse(async (send) => {
      send({ type: "error", message: "Bud needs an OpenAI API key to chat." });
      send({ type: "done", actionPerformed: false });
    });
  }

  return ndjsonResponse(async (send) => {
    let actionPerformed = false;

    if (confirm) {
      const result = await executeTool(user.id, confirm.name, confirm.args);
      send({ type: "action", message: result.message, success: result.success });
      send({ type: "text", delta: result.success ? `Done — ${result.message}.` : `I could not do that: ${result.message}` });
      send({ type: "done", actionPerformed: result.success });
      return;
    }

    const snapshot = await compactSnapshot(user.id);
    const context = `CURRENT USER: ${user.name || user.email}

READY TO ASSIGN: ${formatCurrency(snapshot.readyToAssign)} of ${formatCurrency(snapshot.cash)} cash

ACCOUNTS:
${snapshot.accounts.map((account) => `- ${account.name} | ID ${account.id} | ${formatCurrency(account.balance)} | ready ${formatCurrency(account.readyToAssign)}`).join("\n") || "(none)"}

ENVELOPES:
${snapshot.envelopes.map((envelope) => `- ${envelope.name} (${envelope.kind}) | ID ${envelope.id} | account ${envelope.accountId} | ${formatCurrency(envelope.balance)}`).join("\n") || "(none)"}

FOCUS GOAL ID: ${snapshot.focusGoalId ?? "none"}

UPCOMING BILLS:
${snapshot.bills.map((bill) => `- ${bill.description} ${formatCurrency(bill.amount)} due ${bill.nextDueAt} | ID ${bill.id}`).join("\n") || "(none)"}

Default account: ${snapshot.accounts[0]?.name ?? "none"} (${snapshot.accounts[0]?.id ?? "none"}).`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: BUD_SYSTEM_PROMPT },
      { role: "system", content: context },
      ...history.map((item) => ({ role: item.role as "user" | "assistant", content: item.content })),
      { role: "user", content: message!.trim() },
    ];

    const first = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      stream: true,
      temperature: 0.6,
      max_tokens: 500,
    });

    const toolCalls: { id: string; name: string; arguments: string }[] = [];
    for await (const chunk of first) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) send({ type: "text", delta: delta.content });
      for (const part of delta?.tool_calls ?? []) {
        const index = part.index ?? 0;
        toolCalls[index] ??= { id: "", name: "", arguments: "" };
        if (part.id) toolCalls[index].id = part.id;
        if (part.function?.name) toolCalls[index].name += part.function.name;
        if (part.function?.arguments) toolCalls[index].arguments += part.function.arguments;
      }
    }

    if (!toolCalls.length) {
      send({ type: "done", actionPerformed: false });
      return;
    }

    const assistantToolMessage: OpenAI.Chat.ChatCompletionMessageParam = {
      role: "assistant",
      content: null,
      tool_calls: toolCalls.map((call) => ({
        id: call.id || call.name,
        type: "function" as const,
        function: { name: call.name, arguments: call.arguments || "{}" },
      })),
    };

    const toolMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    let waitingOnConfirm = false;

    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.arguments || "{}") as Record<string, unknown>;
      } catch {
        args = {};
      }

      if (DESTRUCTIVE.has(call.name)) {
        send({
          type: "confirm",
          id: call.id || call.name,
          name: call.name,
          args,
          summary: confirmSummary(call.name, args),
        });
        waitingOnConfirm = true;
        toolMessages.push({
          role: "tool",
          tool_call_id: call.id || call.name,
          content: JSON.stringify({ success: false, message: "Waiting for the user to confirm" }),
        });
        continue;
      }

      const result = await executeTool(user.id, call.name, args);
      if (result.success && call.name !== "get_snapshot") actionPerformed = true;
      send({ type: "action", message: result.message, success: result.success });
      toolMessages.push({
        role: "tool",
        tool_call_id: call.id || call.name,
        content: JSON.stringify(result),
      });
    }

    if (waitingOnConfirm && !actionPerformed) {
      send({ type: "done", actionPerformed: false });
      return;
    }

    const follow = await openai.chat.completions.create({
      model: MODEL,
      messages: [...messages, assistantToolMessage, ...toolMessages],
      stream: true,
      temperature: 0.6,
      max_tokens: 280,
    });
    for await (const chunk of follow) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) send({ type: "text", delta });
    }
    send({ type: "done", actionPerformed });
  });
}
