import { URGENCY_LABELS, type Brief } from "@/domain/brief";

/**
 * An action brief for an officer. It says how it was written, because an AI draft must be
 * checked before anyone acts on it.
 */
export function BriefView({ brief }: { brief: Brief }) {
  return (
    // A div, not a section: the brief is content inside another labelled region, so it must
    // not add a landmark of its own.
    <div className="flex flex-col gap-3 rounded-lg border-l-4 border-brand-600 bg-brand-50 p-4">
      <p className="text-sm font-semibold text-zinc-900">{URGENCY_LABELS[brief.urgency]}</p>
      <p className="text-base font-medium text-zinc-950">{brief.headline}</p>
      <p className="text-sm text-zinc-800">{brief.issue}</p>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-zinc-900">Evidence</p>
        <ul className="list-disc pl-5 text-sm text-zinc-800">
          {brief.evidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-zinc-800">
        <span className="font-medium">Suggested action: </span>
        {brief.suggestedAction}
      </p>
      <p className="text-xs text-zinc-700">
        {brief.method === "llm"
          ? "Drafted by AI from the report facts. Verify before acting."
          : "Written from the recorded facts without AI. Verify before acting."}
      </p>
    </div>
  );
}
