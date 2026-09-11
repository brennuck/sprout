import { NextResponse } from "next/server";
import { processDueRecurringContributions } from "@/lib/services/recurring-funding";
import { processDueBills } from "@/lib/services/bills";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorize(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  return Boolean(cronSecret && authorization === `Bearer ${cronSecret}`);
}

export async function GET(request: Request) {
  try {
    if (!authorize(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const [recurring, bills] = await Promise.all([
      processDueRecurringContributions(),
      processDueBills(),
    ]);
    return NextResponse.json({ recurring, bills });
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
