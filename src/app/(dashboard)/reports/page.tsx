import { validateRequest } from "@/lib/auth";
import { getDashboardReport } from "@/lib/services/reports";
import { ReportsDashboard } from "@/components/dashboard/ReportsDashboard";

export default async function ReportsPage() {
  const { user } = await validateRequest();
  if (!user) return null;
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const report = await getDashboardReport(user.id, { from, to: now });
  return <ReportsDashboard initialReport={report} />;
}
