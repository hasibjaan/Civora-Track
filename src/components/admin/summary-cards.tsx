import type { DashboardStats } from "@/application/dashboard";

const CARDS: ReadonlyArray<{ key: keyof DashboardStats; label: string; hint: string }> = [
  { key: "open", label: "Open reports", hint: "Not yet resolved or rejected" },
  { key: "urgent", label: "Urgent", hint: "Needs attention first" },
  { key: "repeated", label: "Possible repeats", hint: "Match another open report" },
  { key: "hotspots", label: "Hotspots", hint: "Areas with several open reports" },
];

export function SummaryCards({ stats }: { stats: DashboardStats }) {
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <dt className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{card.label}</dt>
          <dd className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
            {stats[card.key]}
          </dd>
          <dd className="text-xs text-zinc-600 dark:text-zinc-400">{card.hint}</dd>
        </div>
      ))}
    </dl>
  );
}
