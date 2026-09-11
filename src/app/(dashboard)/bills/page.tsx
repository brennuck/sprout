import { validateRequest } from "@/lib/auth";
import { BillsManager } from "@/components/bills/BillsManager";

export default async function BillsPage() {
  const { user } = await validateRequest();
  if (!user) return null;
  return <BillsManager />;
}
