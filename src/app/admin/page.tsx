import type { Metadata } from "next";
import { connection } from "next/server";

import { briefFor } from "@/ai";
import { buildDashboard } from "@/application/dashboard";
import { hotspotFacts } from "@/application/briefs";
import { HotspotList } from "@/components/admin/hotspot-list";
import { HotspotMapLoader } from "@/components/admin/hotspot-map-loader";
import { QueueTable } from "@/components/admin/queue-table";
import { SummaryCards } from "@/components/admin/summary-cards";
import { reportRepository } from "@/data";
import { satelliteLayer } from "@/maps";

export const metadata: Metadata = {
  title: "Officer dashboard",
  // Officer pages hold citizens' personal details. Keep them out of search engines.
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // Ages and briefs depend on the current time, so this must render per request.
  await connection();
  const now = new Date();
  const dashboard = buildDashboard(await reportRepository.list(), now);

  // Briefs and satellite imagery are fetched in parallel, since each can take a second or two.
  const [hotspots, satellite] = await Promise.all([
    Promise.all(
      dashboard.hotspots.map(async (hotspot) => {
        const members = dashboard.queue.filter((report) => hotspot.reportIds.includes(report.id));
        return { ...hotspot, brief: await briefFor(hotspotFacts(hotspot, members, now)) };
      }),
    ),
    satelliteLayer(),
  ]);

  return (
    <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Officer dashboard</h1>
        <p className="text-base text-zinc-700">
          Open reports ranked by priority, with areas where problems cluster together.
        </p>
      </header>

      <SummaryCards stats={dashboard.stats} />

      <section aria-labelledby="map-heading" className="flex flex-col gap-3">
        <h2 id="map-heading" className="text-xl font-semibold text-zinc-950">
          Map
        </h2>
        <p className="text-sm text-zinc-700">
          Each dot is an open report, coloured by priority. Dashed circles mark hotspots. When
          satellite imagery is configured, use the layer button to switch between satellite and
          street views. The lists below give the same information without the map.
        </p>
        {/* Leaflet cannot fit a map to zero points, so an empty queue has no map to draw. */}
        {dashboard.markers.length > 0 ? (
          <HotspotMapLoader
            markers={dashboard.markers}
            hotspots={dashboard.hotspots}
            satellite={satellite}
          />
        ) : (
          <p className="text-base text-zinc-700">No open reports to show on the map.</p>
        )}
      </section>

      <section aria-labelledby="hotspots-heading" className="flex flex-col gap-3">
        <h2 id="hotspots-heading" className="text-xl font-semibold text-zinc-950">
          Hotspots
        </h2>
        <HotspotList hotspots={hotspots} headingId="hotspots-heading" />
      </section>

      <section aria-labelledby="queue-heading" className="flex flex-col gap-3">
        <h2 id="queue-heading" className="text-xl font-semibold text-zinc-950">
          Queue
        </h2>
        <QueueTable reports={dashboard.queue} />
      </section>
    </main>
  );
}
