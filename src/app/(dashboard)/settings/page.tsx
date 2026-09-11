import { validateRequest } from "@/lib/auth";
import { SettingsManager } from "@/components/dashboard/SettingsManager";

export default async function SettingsPage() {
  const { user } = await validateRequest();
  if (!user) return null;

  return <SettingsManager user={{ name: user.name, email: user.email }} />;
}
