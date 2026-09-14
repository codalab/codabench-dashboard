import { getCompetitions } from "@/lib/competitions-store";
import { OrganizerTreemap } from "@/components/treemap/OrganizerTreemap";

export const dynamic = "force-dynamic";

export default function OrganizersPage() {
  return (
    <div className="h-[calc(100vh-56px)] w-full">
      <OrganizerTreemap competitions={getCompetitions()} />
    </div>
  );
}
