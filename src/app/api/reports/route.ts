import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { errorResponse, AppError } from "@/lib/errors";
import { requireDashboardAccess } from "@/lib/authorization";
import { getDashboardReport } from "@/lib/services/reports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(request.url);
    const ownerId = url.searchParams.get("ownerId") || user.id;
    await requireDashboardAccess(user.id, ownerId);

    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const from = url.searchParams.get("from")
      ? new Date(`${url.searchParams.get("from")}T00:00:00`)
      : defaultFrom;
    const to = url.searchParams.get("to")
      ? new Date(`${url.searchParams.get("to")}T23:59:59.999`)
      : now;
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new AppError("Choose a valid report date range", 400, "INVALID_RANGE");
    }

    return NextResponse.json(await getDashboardReport(ownerId, { from, to }));
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
