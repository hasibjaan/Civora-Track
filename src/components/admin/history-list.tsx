import { describeHistoryEntry } from "@/application/history";
import type { HistoryEntry } from "@/domain/types";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

/** Every change to a report, newest first, with who made it and when. */
export function HistoryList({ entries }: { entries: readonly HistoryEntry[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {[...entries].reverse().map((entry, index) => (
        <li
          key={`${entry.at}-${entry.type}-${index}`}
          className="flex flex-col gap-1 border-l-2 border-zinc-300 pl-4"
        >
          <p className="text-base text-zinc-950">{describeHistoryEntry(entry)}</p>
          <p className="text-sm text-zinc-700">
            <time dateTime={entry.at}>{DATE_FORMAT.format(new Date(entry.at))} UTC</time>
            {" · "}
            by {entry.actor}
          </p>
        </li>
      ))}
    </ol>
  );
}
