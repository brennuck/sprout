import { NextResponse } from "next/server";
import { z } from "zod";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createLedgerTransaction,
  createLedgerTransfer,
  deleteLedgerTransaction,
  createLedgerAccount,
  deleteLedgerAccount,
} from "@/lib/services/ledger";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const chatSchema = z.object({
  message: z.string().min(1, "Message is required"),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional().default([]),
});

// Bud's system prompt
const BUD_SYSTEM_PROMPT = `You are Bud, a friendly and helpful personal gardener who helps users manage their finances in the Sprout budgeting app.

Your personality:
- Warm, friendly, and encouraging
- Use gardening metaphors when talking about finances (money "growing", "planting seeds" for savings, "harvesting" for income, "weeds" for unnecessary expenses)
- Keep responses concise and helpful (1-2 short paragraphs max)
- You speak casually but professionally

You can perform these actions for the user:
1. ADD TRANSACTIONS - When user mentions spending or receiving money, use add_transaction
2. CREATE ACCOUNTS - When user wants a new account, use create_account
3. TRANSFER MONEY - When user wants to move money between accounts, use transfer_money
4. DELETE TRANSACTIONS - When user wants to remove a transaction, use delete_transaction
5. DELETE ACCOUNTS - When user wants to close/remove an account, use delete_account

IMPORTANT RULES:
- Always confirm what you're about to do before doing it, OR do it and confirm what you did
- If info is missing (like which account), ask the user
- Use the account IDs provided in the context, not names
- For expenses, amount should be positive (the system handles the sign)
- Be helpful and proactive - if user says "I spent $50 at Target", just add it!

Current user context will be provided with their accounts and recent transactions.`;

// OpenAI function definitions
const functions: OpenAI.Chat.ChatCompletionCreateParams.Function[] = [
  {
    name: "add_transaction",
    description: "Add a new transaction (expense or income) to an account",
    parameters: {
      type: "object",
      properties: {
        accountId: {
          type: "string",
          description: "The ID of the account to add the transaction to",
        },
        amount: {
          type: "number",
          description: "The amount of the transaction (positive number)",
        },
        description: {
          type: "string",
          description: "Description of the transaction (e.g., 'Groceries at Walmart')",
        },
        type: {
          type: "string",
          enum: ["EXPENSE", "INCOME"],
          description: "Whether this is an expense or income",
        },
        date: {
          type: "string",
          description: "Date of transaction in ISO format (defaults to today if not specified)",
        },
      },
      required: ["accountId", "amount", "description", "type"],
    },
  },
  {
    name: "create_account",
    description: "Create a new account for the user",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the account (e.g., 'Emergency Fund', 'Vacation Savings')",
        },
        type: {
          type: "string",
          enum: ["SAVINGS", "BUDGET", "ALLOWANCE", "RETIREMENT", "STOCK"],
          description: "Type of account",
        },
        startingBalance: {
          type: "number",
          description: "Initial balance for the account (defaults to 0)",
        },
      },
      required: ["name", "type"],
    },
  },
  {
    name: "transfer_money",
    description: "Transfer money between two accounts",
    parameters: {
      type: "object",
      properties: {
        fromAccountId: {
          type: "string",
          description: "The ID of the account to transfer FROM",
        },
        toAccountId: {
          type: "string",
          description: "The ID of the account to transfer TO",
        },
        amount: {
          type: "number",
          description: "Amount to transfer (positive number)",
        },
        description: {
          type: "string",
          description: "Note for the transfer",
        },
      },
      required: ["fromAccountId", "toAccountId", "amount"],
    },
  },
  {
    name: "delete_transaction",
    description: "Delete a transaction by its ID",
    parameters: {
      type: "object",
      properties: {
        transactionId: {
          type: "string",
          description: "The ID of the transaction to delete",
        },
      },
      required: ["transactionId"],
    },
  },
  {
    name: "delete_account",
    description: "Delete an account and all its transactions",
    parameters: {
      type: "object",
      properties: {
        accountId: {
          type: "string",
          description: "The ID of the account to delete",
        },
      },
      required: ["accountId"],
    },
  },
];

// Execute function calls
async function executeFunction(
  name: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ success: boolean; message: string; data?: unknown }> {
  try {
    switch (name) {
      case "add_transaction": {
        const amount = args.amount as number;
        const type = args.type as "EXPENSE" | "INCOME";
        const result = await createLedgerTransaction({
          actorId: userId,
          accountId: args.accountId as string,
          amount,
          description: args.description as string,
          type,
          date: args.date ? new Date(args.date as string) : undefined,
        });

        return {
          success: true,
          message: `Added ${type.toLowerCase()} of $${amount.toFixed(2)} for "${args.description}"`,
          data: result,
        };
      }

      case "create_account": {
        const newAccount = await createLedgerAccount({
          actorId: userId,
          name: args.name as string,
          type: args.type as "SAVINGS" | "BUDGET" | "ALLOWANCE" | "RETIREMENT" | "STOCK",
          startingBalance: (args.startingBalance as number) || 0,
        });

        return {
          success: true,
          message: `Created new ${(args.type as string).toLowerCase()} account "${args.name}"${args.startingBalance ? ` with $${(args.startingBalance as number).toFixed(2)}` : ""}`,
          data: newAccount,
        };
      }

      case "transfer_money": {
        const [fromAccount, toAccount] = await Promise.all([
          prisma.account.findUnique({ where: { id: args.fromAccountId as string } }),
          prisma.account.findUnique({ where: { id: args.toAccountId as string } }),
        ]);
        const amount = args.amount as number;
        await createLedgerTransfer({
          actorId: userId,
          fromAccountId: args.fromAccountId as string,
          toAccountId: args.toAccountId as string,
          amount,
          description: (args.description as string) || undefined,
        });

        return {
          success: true,
          message: `Transferred $${amount.toFixed(2)} from ${fromAccount?.name || "source"} to ${toAccount?.name || "destination"}`,
        };
      }

      case "delete_transaction": {
        const transaction = await prisma.transaction.findUnique({
          where: { id: args.transactionId as string },
        });
        if (!transaction) {
          return { success: false, message: "Transaction not found" };
        }
        await deleteLedgerTransaction(userId, args.transactionId as string);

        return {
          success: true,
          message: `Deleted transaction "${transaction.description}"`,
        };
      }

      case "delete_account": {
        const account = await prisma.account.findUnique({ where: { id: args.accountId as string } });

        if (!account) {
          return { success: false, message: "Account not found" };
        }

        await deleteLedgerAccount(userId, args.accountId as string);

        return {
          success: true,
          message: `Deleted account "${account.name}" and all its transactions`,
        };
      }

      default:
        return { success: false, message: "Unknown action" };
    }
  } catch (error) {
    console.error("Function execution error:", error);
    return { success: false, message: "Failed to perform action" };
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = chatSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { message, history } = result.data;

    // Fetch user's financial context
    const [accounts, recentTransactions] = await Promise.all([
      prisma.account.findMany({
        where: { userId: user.id },
        select: { id: true, name: true, type: true, balance: true },
      }),
      prisma.transaction.findMany({
        where: { account: { userId: user.id } },
        orderBy: { date: "desc" },
        take: 15,
        include: { account: { select: { name: true } } },
      }),
    ]);

    // Build context message
    const contextMessage = `
CURRENT USER: ${user.name || user.email}

THEIR ACCOUNTS (use these IDs when performing actions):
${accounts.map(a => `- "${a.name}" (${a.type}) | ID: ${a.id} | Balance: $${Number(a.balance).toFixed(2)}`).join('\n')}

RECENT TRANSACTIONS:
${recentTransactions.map(t => `- ${t.description}: $${Number(t.amount).toFixed(2)} (${t.type}) | ID: ${t.id} | Date: ${t.date.toLocaleDateString()} | Account: ${t.account.name}`).join('\n')}

If user doesn't specify an account, use their first account (${accounts[0]?.name || "none"}, ID: ${accounts[0]?.id || "none"}) as default.
`;

    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: BUD_SYSTEM_PROMPT },
      { role: "system", content: contextMessage },
      ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user", content: message },
    ];

    // Call OpenAI with function calling
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      functions,
      function_call: "auto",
      max_tokens: 500,
      temperature: 0.7,
    });

    const responseMessage = completion.choices[0]?.message;
    let reply = responseMessage?.content || "";
    let actionPerformed = false;

    // Handle function call if present
    if (responseMessage?.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionArgs = JSON.parse(responseMessage.function_call.arguments || "{}");

      const functionResult = await executeFunction(functionName, functionArgs, user.id);
      actionPerformed = functionResult.success;

      // Get GPT to generate a natural response based on the function result
      const followUpMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        ...messages,
        responseMessage as OpenAI.Chat.ChatCompletionMessageParam,
        {
          role: "function",
          name: functionName,
          content: JSON.stringify(functionResult),
        },
      ];

      const followUpCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: followUpMessages,
        max_tokens: 200,
        temperature: 0.7,
      });

      reply = followUpCompletion.choices[0]?.message?.content || 
        (functionResult.success ? `Done! ${functionResult.message}` : `Oops! ${functionResult.message}`);
    }

    return NextResponse.json({ 
      reply,
      actionPerformed,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
