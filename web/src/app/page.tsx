import { getCompetitions } from "@/lib/competitions-store";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const dynamic = "force-dynamic";

export default function RootPage() {
  return <Dashboard data={getCompetitions()} />;
}
