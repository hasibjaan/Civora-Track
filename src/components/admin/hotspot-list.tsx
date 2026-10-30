import type { HotspotView } from "@/application/dashboard";
import type { Brief } from "@/domain/brief";

import { BriefView } from "./brief-view";
import { PriorityBadge } from "./priority-badge";

export type HotspotCard = HotspotView & { brief: Brief };

interface HotspotListProps {
  hotspots: readonly HotspotCard[];
  headingId: string;
}

export function HotspotList({ hotspots, headingId }: HotspotListProps) {
  if (hotspots.length === 0) {
    return (
      <p className="text-base text-zinc-700">
        No hotspots yet. An area appears here once three or more open reports cluster together.
      </p>
    );
  }

  return (
    <ul aria-labelledby={headingId} className="grid gap-4 md:grid-cols-2">
      {hotspots.map((hotspot) => (
        <li
          key={hotspot.id}
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-zinc-950">{hotspot.title}</h3>
            <PriorityBadge level={hotspot.level} />
          </div>
          <p className="text-sm text-zinc-700">{hotspot.description}</p>
          <p className="font-mono text-xs text-zinc-600">{hotspot.reportIds.join(", ")}</p>
          <BriefView brief={hotspot.brief} />
        </li>
      ))}
    </ul>
  );
}
