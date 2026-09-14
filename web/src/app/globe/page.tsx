import { getCompetitions } from "@/lib/competitions-store";
import { GlobeView } from "@/components/globe/GlobeView";

export const dynamic = "force-dynamic";

export default function GlobePage() {
  const competitions = getCompetitions().map((c) => ({ countries: c.countries }));
  return (
    <div className="h-[calc(100vh-56px)] w-full">
      <GlobeView competitions={competitions} />
    </div>
  );
}
