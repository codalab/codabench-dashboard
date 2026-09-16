import { getCompetitions } from "@/lib/competitions-store";
import { ConferenceTreemap } from "@/components/treemap/ConferenceTreemap";

export const dynamic = "force-dynamic";

export default function ConferencesPage() {
  return (
    <div className="h-[calc(100vh-56px)] w-full">
      <ConferenceTreemap competitions={getCompetitions()} />
    </div>
  );
}
