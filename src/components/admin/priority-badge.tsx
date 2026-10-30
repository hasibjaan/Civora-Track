import { PRIORITY_LABELS } from "@/domain/priority";
import type { PriorityLevel } from "@/domain/types";

const STYLES: Record<PriorityLevel, string> = {
  urgent: "bg-red-800 text-white",
  high: "bg-orange-800 text-white",
  medium: "bg-amber-200 text-amber-950",
  low: "bg-zinc-200 text-zinc-900",
};

/** The level is shown as text, so it never depends on colour alone. */
export function PriorityBadge({ level }: { level: PriorityLevel }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${STYLES[level]}`}
    >
      {PRIORITY_LABELS[level]}
    </span>
  );
}
